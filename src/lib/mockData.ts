import type { TournamentData } from './types'

export const MOCK_TOURNAMENT: TournamentData = {
  course: {
    name: 'Augusta National',
    rating: 76.2,
    slope: 148,
    par: 72,
    holes: [
      { number: 1,  par: 4, strokeIndex: 11 },
      { number: 2,  par: 5, strokeIndex: 3  },
      { number: 3,  par: 4, strokeIndex: 15 },
      { number: 4,  par: 3, strokeIndex: 17 },
      { number: 5,  par: 4, strokeIndex: 5  },
      { number: 6,  par: 3, strokeIndex: 13 },
      { number: 7,  par: 4, strokeIndex: 7  },
      { number: 8,  par: 5, strokeIndex: 1  },
      { number: 9,  par: 4, strokeIndex: 9  },
      { number: 10, par: 4, strokeIndex: 10 },
      { number: 11, par: 4, strokeIndex: 2  },
      { number: 12, par: 3, strokeIndex: 18 },
      { number: 13, par: 5, strokeIndex: 4  },
      { number: 14, par: 4, strokeIndex: 14 },
      { number: 15, par: 5, strokeIndex: 6  },
      { number: 16, par: 3, strokeIndex: 16 },
      { number: 17, par: 4, strokeIndex: 12 },
      { number: 18, par: 4, strokeIndex: 8  },
    ],
  },

  teams: {
    team1: { name: 'Team USA' },
    team2: { name: 'Team Europe' },
  },

  players: [
    // Team 1
    { name: 'Matt',  handicapIndex: 8.4,  team: 1 },
    { name: 'Jake',  handicapIndex: 14.2, team: 1 },
    { name: 'Tyler', handicapIndex: 3.1,  team: 1 },
    { name: 'Ben',   handicapIndex: 19.8, team: 1 },
    { name: 'Chris', handicapIndex: 11.5, team: 1 },
    // Team 2
    { name: 'Danny', handicapIndex: 6.7,  team: 2 },
    { name: 'Sam',   handicapIndex: 16.3, team: 2 },
    { name: 'Alex',  handicapIndex: 2.1,  team: 2 },
    { name: 'Ryan',  handicapIndex: 22.0, team: 2 },
    { name: 'Nick',  handicapIndex: 9.9,  team: 2 },
  ],

  sessions: [
    // -------------------------------------------------------------------------
    // Morning Scramble
    // -------------------------------------------------------------------------
    {
      name: 'Morning Scramble',
      format: 'Scramble',
      sortOrder: 1,
      matches: [
        {
          id: 'M001',
          team1Players: ['Matt', 'Jake'],
          team2Players: ['Danny', 'Sam'],
          sortOrder: 1,
          scores: {
            1:  { team1: { Matt: 5 }, team2: { Danny: 4 } },
            2:  { team1: { Matt: 5 }, team2: { Danny: 6 } },
            3:  { team1: { Matt: 4 }, team2: { Danny: 5 } },
            4:  { team1: { Matt: 3 }, team2: { Danny: 3 } },
            5:  { team1: { Matt: 5 }, team2: { Danny: 4 } },
            6:  { team1: { Matt: 3 }, team2: { Danny: 4 } },
            7:  { team1: { Matt: 4 }, team2: { Danny: 5 } },
            8:  { team1: { Matt: 5 }, team2: { Danny: 5 } },
            9:  { team1: { Matt: 4 }, team2: { Danny: 4 } },
          },
        },
        {
          id: 'M002',
          team1Players: ['Tyler', 'Ben'],
          team2Players: ['Alex', 'Ryan'],
          sortOrder: 2,
          scores: {
            1: { team1: { Tyler: 4 }, team2: { Alex: 4 } },
            2: { team1: { Tyler: 5 }, team2: { Alex: 5 } },
            3: { team1: { Tyler: 4 }, team2: { Alex: 3 } },
            4: { team1: { Tyler: 4 }, team2: { Alex: 3 } },
            5: { team1: { Tyler: 4 }, team2: { Alex: 5 } },
            6: { team1: { Tyler: 2 }, team2: { Alex: 3 } },
            7: { team1: { Tyler: 4 }, team2: { Alex: 4 } },
            8: { team1: { Tyler: 6 }, team2: { Alex: 5 } },
            9: { team1: { Tyler: 5 }, team2: { Alex: 4 } },
          },
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Afternoon Best Ball
    // -------------------------------------------------------------------------
    {
      name: 'Afternoon Best Ball',
      format: 'Best Ball',
      sortOrder: 2,
      matches: [
        {
          id: 'M003',
          team1Players: ['Matt', 'Chris'],
          team2Players: ['Nick', 'Danny'],
          sortOrder: 1,
          scores: {
            1: { team1: { Matt: 5, Chris: 4 }, team2: { Nick: 4, Danny: 5 } },
            2: { team1: { Matt: 5, Chris: 6 }, team2: { Nick: 5, Danny: 5 } },
            3: { team1: { Matt: 4, Chris: 4 }, team2: { Nick: 5, Danny: 4 } },
            4: { team1: { Matt: 3, Chris: 4 }, team2: { Nick: 3, Danny: 4 } },
            5: { team1: { Matt: 5, Chris: 5 }, team2: { Nick: 4, Danny: 5 } },
            6: { team1: { Matt: 3, Chris: 4 }, team2: { Nick: 3, Danny: 3 } },
          },
        },
        {
          id: 'M004',
          team1Players: ['Jake', 'Ben'],
          team2Players: ['Sam', 'Ryan'],
          sortOrder: 2,
          scores: {
            1: { team1: { Jake: 5, Ben: 6 }, team2: { Sam: 5, Ryan: 7 } },
            2: { team1: { Jake: 6, Ben: 7 }, team2: { Sam: 5, Ryan: 6 } },
            3: { team1: { Jake: 5, Ben: 5 }, team2: { Sam: 6, Ryan: 7 } },
            4: { team1: { Jake: 4, Ben: 5 }, team2: { Sam: 4, Ryan: 5 } },
            5: { team1: { Jake: 5, Ben: 6 }, team2: { Sam: 5, Ryan: 6 } },
            6: { team1: { Jake: 4, Ben: 5 }, team2: { Sam: 5, Ryan: 6 } },
          },
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Sunday Singles
    // -------------------------------------------------------------------------
    {
      name: 'Sunday Singles',
      format: 'Singles',
      sortOrder: 3,
      matches: [
        {
          id: 'M005',
          team1Players: ['Matt'],
          team2Players: ['Alex'],
          sortOrder: 1,
          scores: {
            1:  { team1: { Matt: 5 }, team2: { Alex: 4 } },
            2:  { team1: { Matt: 5 }, team2: { Alex: 5 } },
            3:  { team1: { Matt: 4 }, team2: { Alex: 5 } },
            4:  { team1: { Matt: 3 }, team2: { Alex: 3 } },
            5:  { team1: { Matt: 5 }, team2: { Alex: 4 } },
            6:  { team1: { Matt: 3 }, team2: { Alex: 4 } },
            7:  { team1: { Matt: 4 }, team2: { Alex: 5 } },
            8:  { team1: { Matt: 5 }, team2: { Alex: 6 } },
            9:  { team1: { Matt: 4 }, team2: { Alex: 4 } },
            10: { team1: { Matt: 4 }, team2: { Alex: 5 } },
            11: { team1: { Matt: 5 }, team2: { Alex: 4 } },
            12: { team1: { Matt: 3 }, team2: { Alex: 3 } },
            13: { team1: { Matt: 5 }, team2: { Alex: 6 } },
            14: { team1: { Matt: 4 }, team2: { Alex: 5 } },
          },
        },
        {
          id: 'M006',
          team1Players: ['Tyler'],
          team2Players: ['Danny'],
          sortOrder: 2,
          scores: {
            1:  { team1: { Tyler: 4 }, team2: { Danny: 4 } },
            2:  { team1: { Tyler: 5 }, team2: { Danny: 6 } },
            3:  { team1: { Tyler: 4 }, team2: { Danny: 4 } },
            4:  { team1: { Tyler: 3 }, team2: { Danny: 4 } },
            5:  { team1: { Tyler: 4 }, team2: { Danny: 5 } },
            6:  { team1: { Tyler: 3 }, team2: { Danny: 3 } },
            7:  { team1: { Tyler: 4 }, team2: { Danny: 4 } },
            8:  { team1: { Tyler: 5 }, team2: { Danny: 5 } },
            9:  { team1: { Tyler: 4 }, team2: { Danny: 5 } },
            10: { team1: { Tyler: 4 }, team2: { Danny: 4 } },
            11: { team1: { Tyler: 4 }, team2: { Danny: 5 } },
            12: { team1: { Tyler: 3 }, team2: { Danny: 3 } },
            13: { team1: { Tyler: 5 }, team2: { Danny: 6 } },
            14: { team1: { Tyler: 4 }, team2: { Danny: 5 } },
          },
        },
        {
          id: 'M007',
          team1Players: ['Chris'],
          team2Players: ['Nick'],
          sortOrder: 3,
          scores: {
            1:  { team1: { Chris: 5 }, team2: { Nick: 4 } },
            2:  { team1: { Chris: 6 }, team2: { Nick: 5 } },
            3:  { team1: { Chris: 5 }, team2: { Nick: 4 } },
            4:  { team1: { Chris: 4 }, team2: { Nick: 3 } },
            5:  { team1: { Chris: 5 }, team2: { Nick: 5 } },
            6:  { team1: { Chris: 4 }, team2: { Nick: 3 } },
            7:  { team1: { Chris: 5 }, team2: { Nick: 4 } },
            8:  { team1: { Chris: 6 }, team2: { Nick: 5 } },
            9:  { team1: { Chris: 4 }, team2: { Nick: 5 } },
            10: { team1: { Chris: 4 }, team2: { Nick: 4 } },
            11: { team1: { Chris: 5 }, team2: { Nick: 4 } },
            12: { team1: { Chris: 3 }, team2: { Nick: 3 } },
            13: { team1: { Chris: 5 }, team2: { Nick: 5 } },
            14: { team1: { Chris: 4 }, team2: { Nick: 5 } },
          },
        },
        {
          id: 'M008',
          team1Players: ['Ben'],
          team2Players: ['Sam'],
          sortOrder: 4,
          scores: {
            1:  { team1: { Ben: 6 }, team2: { Sam: 5 } },
            2:  { team1: { Ben: 7 }, team2: { Sam: 6 } },
            3:  { team1: { Ben: 5 }, team2: { Sam: 6 } },
            4:  { team1: { Ben: 5 }, team2: { Sam: 4 } },
            5:  { team1: { Ben: 6 }, team2: { Sam: 5 } },
            6:  { team1: { Ben: 5 }, team2: { Sam: 4 } },
            7:  { team1: { Ben: 5 }, team2: { Sam: 5 } },
            8:  { team1: { Ben: 7 }, team2: { Sam: 6 } },
            9:  { team1: { Ben: 5 }, team2: { Sam: 5 } },
            10: { team1: { Ben: 6 }, team2: { Sam: 5 } },
            11: { team1: { Ben: 6 }, team2: { Sam: 6 } },
            12: { team1: { Ben: 4 }, team2: { Sam: 3 } },
            13: { team1: { Ben: 6 }, team2: { Sam: 6 } },
            14: { team1: { Ben: 5 }, team2: { Sam: 5 } },
          },
        },
      ],
    },
  ],
}
