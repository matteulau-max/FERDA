/**
 * SheetHelpers.gs
 * Pure sheet-reading helpers. Each function returns a plain JS object/array.
 */

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

// ---------------------------------------------------------------------------
// Course(s)
// ---------------------------------------------------------------------------

// Read one course from an already-resolved sheet object.
function readCourse_(sheet) {
  var data = sheet.getDataRange().getValues();

  // Row 2 (index 1): name, rating, slope, par
  var name   = data[1][0];
  var rating = parseFloat(data[1][1]);
  var slope  = parseInt(data[1][2], 10);
  var par    = parseInt(data[1][3], 10);

  // Rows 5-22 (index 4-21): hole, par, strokeIndex
  var holes = [];
  for (var i = 4; i <= 21; i++) {
    if (!data[i] || data[i][0] === '') continue;
    holes.push({
      number:      parseInt(data[i][0], 10),
      par:         parseInt(data[i][1], 10),
      strokeIndex: parseInt(data[i][2], 10)
    });
  }

  return { name: name, rating: rating, slope: slope, par: par, holes: holes };
}

// Return all courses — every sheet tab whose name starts with "Course".
function getCourses() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var courses = [];
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().indexOf('Course') === 0) {
      courses.push(readCourse_(sheets[i]));
    }
  }
  return courses;
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------
function getTeams() {
  var sheet = getSheet_('Teams');
  var data = sheet.getDataRange().getValues();
  // Row 2 (index 1): team1 name, team2 name
  return {
    team1: { name: String(data[1][0]) },
    team2: { name: String(data[1][1]) }
  };
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------
function getPlayers() {
  var sheet = getSheet_('Players');
  var data = sheet.getDataRange().getValues();
  var players = [];
  // Row 1 (index 0) is header; data starts at index 1
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] || String(row[0]).trim() === '') continue;
    players.push({
      name:          String(row[0]).trim(),
      handicapIndex: parseFloat(row[1]),
      team:          parseInt(row[2], 10)
    });
  }
  return players;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
function getSessions() {
  var sheet = getSheet_('Sessions');
  var data = sheet.getDataRange().getValues();
  var sessions = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] || String(row[0]).trim() === '') continue;
    sessions.push({
      name:       String(row[0]).trim(),
      format:     String(row[1]).trim(),
      sortOrder:  parseInt(row[2], 10),
      courseName: String(row[3] || '').trim()
    });
  }
  return sessions;
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------
function getMatches() {
  var sheet = getSheet_('Matches');
  var data = sheet.getDataRange().getValues();
  var matches = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] || String(row[0]).trim() === '') continue;

    var t1Players = String(row[2]).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    var t2Players = String(row[3]).split(',').map(function(s) { return s.trim(); }).filter(Boolean);

    matches.push({
      id:           String(row[0]).trim(),
      sessionName:  String(row[1]).trim(),
      team1Players: t1Players,
      team2Players: t2Players,
      sortOrder:    parseInt(row[4], 10)
    });
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Scores  (keyed by matchId)
// ---------------------------------------------------------------------------
function getAllScores() {
  var sheet = getSheet_('Scores');
  var data = sheet.getDataRange().getValues();

  // scores[matchId][hole][side][player] = grossScore
  var scores = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] || String(row[0]).trim() === '') continue;

    var matchId    = String(row[0]).trim();
    var hole       = parseInt(row[1], 10);
    var side       = String(row[2]).trim();   // 'team1' or 'team2'
    var player     = String(row[3]).trim();
    var grossScore = parseInt(row[4], 10);

    if (isNaN(grossScore) || grossScore === 0) continue;

    if (!scores[matchId]) scores[matchId] = {};
    if (!scores[matchId][hole]) scores[matchId][hole] = { team1: {}, team2: {} };
    if (!scores[matchId][hole][side]) scores[matchId][hole][side] = {};

    scores[matchId][hole][side][player] = grossScore;
  }

  return scores;
}

function getScoresForMatch(matchId) {
  var all = getAllScores();
  return all[matchId] || {};
}

// ---------------------------------------------------------------------------
// Score upsert (used by saveScore in Code.gs)
// ---------------------------------------------------------------------------
function upsertScore(matchId, hole, side, player, grossScore) {
  var sheet = getSheet_('Scores');
  var data = sheet.getDataRange().getValues();

  // Find existing row (skip header at index 0)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (
      String(row[0]).trim() === matchId &&
      parseInt(row[1], 10) === hole &&
      String(row[3]).trim() === player
    ) {
      // Update in place (columns are 1-indexed in setValues)
      sheet.getRange(i + 1, 5).setValue(grossScore);
      sheet.getRange(i + 1, 6).setValue(new Date().toISOString());
      return;
    }
  }

  // Append new row
  sheet.appendRow([matchId, hole, side, player, grossScore, new Date().toISOString()]);
}
