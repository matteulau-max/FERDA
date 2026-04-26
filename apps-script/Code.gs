/**
 * Code.gs
 * Main entry point for the Apps Script web app.
 * Deploy as: Execute as "Me", Access "Anyone".
 */

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

function doGet(e) {
  var action = e.parameter.action;
  var callback = e.parameter.callback;
  var result;
  try {
    if (action === 'getTournament')      result = getTournament();
    else if (action === 'getScores')     result = getScores(e.parameter.match);
    else if (action === 'saveScore')     result = saveScoreFromParams(e.parameter);
    else result = { error: 'Unknown action: ' + action };
  } catch (err) {
    result = { error: err.message };
  }
  return respond(result, callback);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'saveScore') return respond(saveScore(data), null);
    return respond({ error: 'Unknown action: ' + data.action }, null);
  } catch (err) {
    return respond({ error: err.message }, null);
  }
}

// The `/**<!---->/` prefix on the JSONP path is a CORB workaround: Chrome sniffs
// the response body and will block it as JSON if it starts with `{` or `[`, even
// when Content-Type is application/javascript.
function respond(data, callback) {
  var json = JSON.stringify(data);
  if (callback) {
    return ContentService
      .createTextOutput('/**/' + callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function saveScoreFromParams(params) {
  return saveScore({
    matchId:    params.matchId,
    hole:       params.hole,
    side:       params.side,
    player:     params.player,
    grossScore: params.grossScore
  });
}

// ---------------------------------------------------------------------------
// getTournament — assembles full JSON response
// ---------------------------------------------------------------------------

function getTournament() {
  var courses  = getCourses();
  var teams    = getTeams();
  var players  = getPlayers();
  var sessions = getSessions();
  var matches  = getMatches();
  var allScores = getAllScores();

  // Sort sessions by sortOrder
  sessions.sort(function(a, b) { return a.sortOrder - b.sortOrder; });

  // Group matches into sessions
  var sessionMap = {};
  sessions.forEach(function(s) {
    sessionMap[s.name] = { name: s.name, format: s.format, sortOrder: s.sortOrder, courseName: s.courseName, matches: [] };
  });

  matches.forEach(function(m) {
    var sess = sessionMap[m.sessionName];
    if (!sess) return; // orphaned match — skip
    sess.matches.push({
      id:           m.id,
      team1Players: m.team1Players,
      team2Players: m.team2Players,
      sortOrder:    m.sortOrder,
      scores:       allScores[m.id] || {}
    });
  });

  // Sort matches within each session
  Object.values(sessionMap).forEach(function(s) {
    s.matches.sort(function(a, b) { return a.sortOrder - b.sortOrder; });
  });

  return {
    courses:  courses,
    teams:    teams,
    players:  players,
    sessions: sessions.map(function(s) { return sessionMap[s.name]; })
  };
}

// ---------------------------------------------------------------------------
// getScores — scores for a single match
// ---------------------------------------------------------------------------

function getScores(matchId) {
  if (!matchId) return { error: 'matchId required' };
  return { matchId: matchId, scores: getScoresForMatch(matchId) };
}

// ---------------------------------------------------------------------------
// saveScore — upsert one player/hole score
// ---------------------------------------------------------------------------

function saveScore(data) {
  var matchId    = data.matchId;
  var hole       = parseInt(data.hole, 10);
  var side       = data.side;       // 'team1' or 'team2'
  var player     = data.player;
  var grossScore = parseInt(data.grossScore, 10);

  if (!matchId || !hole || !side || !player || isNaN(grossScore)) {
    return { success: false, error: 'Missing required fields' };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    upsertScore(matchId, hole, side, player, grossScore);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}
