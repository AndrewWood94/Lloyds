const teamController = require('../../controllers/teamController');
const pool = require('../../db');
const { toTitleCase } = require('../../utils');
const leagueService = require('../../services/leagueService');

// Mock the db pool
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

// Mock the utils
jest.mock('../../utils', () => ({
    toTitleCase: jest.fn(str => str),
  }));

// Mock function for findLeagueID
jest.mock('../../services/leagueService', () => ({
  findLeagueID: jest.fn(), 
}));

// Helper for mock Express response
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

function temporarilyMockConsoleError(testFn) {
  return async(...args) => {
    const originalError = console.error;
    console.error = jest.fn();
    try {
      await testFn(...args);
    } catch (err) {
      throw err;
    } finally {
      console.error = originalError;
    }
  };
}

describe('Team Controller', () => {
  let req;
  let res;

  beforeEach(() => {
      // Reset mocks before each test
      pool.query.mockReset();
      toTitleCase.mockClear(); // Clear call counts etc.

      req = {
      body: {},
      query: {},
      };
      res = mockResponse();
  });

  describe('getTeams', () => {

    const getExpectedQueryText = (whereClause = '') => {
      let query = `
      SELECT t.id, t.name AS team_name, t.created_at, l.name AS league_name, l.country AS league_country
      FROM teams t
      LEFT JOIN leagues l ON t.league_id = l.id`;
      if (whereClause) {
        query += ` WHERE ${whereClause}`;
      }
      query += ' ORDER BY t.name ASC';
      return query;
    };

    it('should return a list of all teams if no query parameters are provided', async () => {
      const mockTeams = [
        { "id": 1, "team_name": "Arsenal", "created_at": "2024-01-01T10:00:00.000Z", "league_name": "Premier League", "league_country": "England"},
        { "id": 2, "team_name": "Barcelona", "created_at": "2024-01-01T10:00:00.000Z", "league_name": "La Liga", "league_country": "Spain" },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockTeams });
  
      await teamController.getTeams(req, res);

      expect(pool.query).toHaveBeenCalledWith(getExpectedQueryText(), []);
      expect(toTitleCase).toHaveBeenCalledWith('Premier League');
      expect(toTitleCase).toHaveBeenCalledWith('England');
      expect(toTitleCase).toHaveBeenCalledWith('La Liga');
      expect(toTitleCase).toHaveBeenCalledWith('Spain');
      expect(res.json).toHaveBeenCalledWith(
        mockTeams.map(t => ({
          ...t,
          league_name: toTitleCase(t.league_name),
          league_country: toTitleCase(t.league_country),
        }))
      );
    });

    it('should return a list of teams filtered by country', async () => {
      req.query = { country: 'ENGLAND' };
      const mockTeams = [
        { "id": 1, "team_name": "Arsenal", "created_at": "2024-01-01T10:00:00.000Z", "league_name": "premier league", "league_country": "england"},
        { "id": 2, "team_name": "Leicester City", "created_at": "2024-01-01T10:00:00.000Z", "league_name": "championship", "league_country": "england" },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockTeams });
  
      await teamController.getTeams(req, res);

      expect(pool.query).toHaveBeenCalledWith(getExpectedQueryText(`l.country = $1`), ['ENGLAND']);
      expect(toTitleCase).toHaveBeenCalledWith('premier league');
      expect(toTitleCase).toHaveBeenCalledWith('championship');
      expect(toTitleCase).toHaveBeenCalledWith('england');
      expect(toTitleCase).toHaveBeenCalledTimes(4);
      expect(res.json).toHaveBeenCalledWith(
        mockTeams.map(t => ({
          ...t,
          league_name: toTitleCase(t.league_name),
          league_country: toTitleCase(t.league_country),
        }))
      );
    });

    it('should return a list of teams filtered by league name', async () => {
      req.query = { league_name: 'serie A' };
      const mockTeams = [
        { "id": 1, "team_name": "AC Milan", "created_at": "2024-01-01T10:00:00.000Z", "league_name": "serie A", "league_country": "Italy"},
        { "id": 2, "team_name": "Flamengo", "created_at": "2024-01-01T10:00:00.000Z", "league_name": "serie A", "league_country": "Brazil" },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockTeams });
  
      await teamController.getTeams(req, res);

      expect(pool.query).toHaveBeenCalledWith(getExpectedQueryText(`l.name = $1`), ['serie A']);
      expect(toTitleCase).toHaveBeenCalledWith('Brazil');
      expect(toTitleCase).toHaveBeenCalledWith('Italy');
      expect(toTitleCase).toHaveBeenCalledWith('serie A');
      expect(toTitleCase).toHaveBeenCalledTimes(4);
      expect(res.json).toHaveBeenCalledWith(
        mockTeams.map(t => ({
          ...t,
          league_name: toTitleCase(t.league_name),
          league_country: toTitleCase(t.league_country),
        }))
      );
    });

    it('should return a list of teams filtered by league name and country', async () => {
      req.query = { league_name: 'serie A', country: 'italy' };
      const mockTeams = [
        { "id": 1, "team_name": "AC Milan", "created_at": "2024-01-01T10:00:00.000Z", "league_name": "serie A", "league_country": "Italy"},
      ];
      pool.query.mockResolvedValueOnce({ rows: mockTeams });
  
      await teamController.getTeams(req, res);

      expect(pool.query).toHaveBeenCalledWith(getExpectedQueryText(`l.country = $1 AND l.name = $2`), ['italy', 'serie A']);
      expect(toTitleCase).toHaveBeenCalledWith('Italy');
      expect(toTitleCase).toHaveBeenCalledWith('serie A');
      expect(toTitleCase).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(
        mockTeams.map(t => ({
          ...t,
          league_name: toTitleCase(t.league_name),
          league_country: toTitleCase(t.league_country),
        }))
      );
    });

    it('should return an empty array if no teams match the filter', async () => {
      req.query = { country: 'Neverland' };
      pool.query.mockResolvedValueOnce({ rows: [] });

      await teamController.getTeams(req, res);

      expect(pool.query).toHaveBeenCalledWith(getExpectedQueryText(`l.country = $1`), ['Neverland']);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should return 500 on database error', temporarilyMockConsoleError(async () => {
      pool.query.mockRejectedValueOnce(new Error('DB Query Failed'));

      await teamController.getTeams(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(console.error).toHaveBeenCalled();
    }));
  });

  describe('createTeam', () => {
    beforeEach(() => {
      leagueService.findLeagueID.mockReset();
    });

    it('should create a team successfully and return 201', async () => {
      req.body = { name: 'New Team FC', league_name: 'Premier League', league_country: 'England' };
      const mockCreatedTeam = { id: 10, name: 'New Team FC', league_id: 1, created_at: new Date() };

      leagueService.findLeagueID.mockResolvedValueOnce({ league_id: 1 });
      pool.query.mockResolvedValueOnce({ rows: [mockCreatedTeam] });

      await teamController.createTeam(req, res);

      expect(leagueService.findLeagueID).toHaveBeenCalledWith('Premier League', 'England');
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO teams (name, league_id) VALUES ($1, $2) RETURNING *',
        ['New Team FC', 1] // teamName from req.body, and found league_id
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCreatedTeam);
    });

    it('should return 400 if team name is missing', async () => {
      req.body = { league_name: 'Premier League' };
      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Team name is required' });
      expect(leagueService.findLeagueID).not.toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 400 if league name is missing', async () => {
      req.body = { name: 'New Team FC' };
      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'League name is required to associate the team.' });
      expect(leagueService.findLeagueID).not.toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 404 if league name is not found', async () => {
      req.body = { name: 'New Team FC', league_name: 'NonExistent League' };
      // Mock for league not found error
      leagueService.findLeagueID.mockResolvedValueOnce({ 
        errorDetail: { message: 'No league found with name: "NonExistent League"', status: 404 } 
      });

      await teamController.createTeam(req, res);

      expect(leagueService.findLeagueID).toHaveBeenCalledWith('NonExistent League', undefined);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'No league found with name: "NonExistent League"' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 404 if league exists but not in the specified country', async () => {
      req.body = { name: 'New Team FC', league_name: 'Premier League', league_country: 'Spain' };

      // Mock for findLeagueID: league found, wrong country
      leagueService.findLeagueID.mockResolvedValueOnce({
        errorDetail: {
          message: 'League "Premier League" exists, but not in country "Spain". It is in "England".',
          status: 404
        }
      });

      await teamController.createTeam(req, res);

      expect(leagueService.findLeagueID).toHaveBeenCalledWith('Premier League', 'Spain');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'League "Premier League" exists, but not in country "Spain". It is in "England".' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 400 if multiple leagues exist with the same name and no country is provided', async () => {
      req.body = { name: 'New Team FC', league_name: 'League Name' };

      leagueService.findLeagueID.mockResolvedValueOnce({
        errorDetail: {
          message: 'Multiple leagues exist with name "League Name". Please provide league_country to specify.',
          status: 400
        }
      });
      await teamController.createTeam(req, res);

      expect(leagueService.findLeagueID).toHaveBeenCalledWith('League Name', undefined);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Multiple leagues exist with name "League Name". Please provide league_country to specify.' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 404 if multiple leagues with same name exist, country provided, but no match', async () => {
      req.body = { name: 'New Team FC', league_name: 'League Name', league_country: 'CountryC' };
      
      leagueService.findLeagueID.mockResolvedValueOnce({
        errorDetail: {
          message: 'League "League Name" found, but not in country "CountryC". Available in: CountryA, CountryB.',
          status: 404
        }
      });
      await teamController.createTeam(req, res);

      expect(leagueService.findLeagueID).toHaveBeenCalledWith('League Name', 'CountryC');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'League "League Name" found, but not in country "CountryC". Available in: CountryA, CountryB.' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 409 if team already exists in the league', temporarilyMockConsoleError(async () => {
      req.body = { name: 'Existing Team', league_name: 'Premier League', league_country: 'England' };
      
      leagueService.findLeagueID.mockResolvedValueOnce({ league_id: 1 });

      // Mock error for unique team/league combination failure
      const dbError = new Error('Unique constraint failed');
      dbError.code = '23505'; // PostgreSQL unique violation error code
      pool.query.mockRejectedValueOnce(dbError);

      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(leagueService.findLeagueID).toHaveBeenCalledWith('Premier League', 'England');
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO teams (name, league_id) VALUES ($1, $2) RETURNING *', ['Existing Team', 1]
      );
      expect(res.json).toHaveBeenCalledWith({ error: 'Team with name "Existing Team" already exists in this league.' });
      expect(console.error).not.toHaveBeenCalled(); 
    }));

    it('should return 500 for other database errors during team creation', temporarilyMockConsoleError(async () => {
      req.body = { name: 'Team X', league_name: 'League Y', league_country: 'Country Z' };
     
      leagueService.findLeagueID.mockResolvedValueOnce({ league_id: 1 }); 
      pool.query.mockRejectedValueOnce(new Error('Generic DB Error on team insert'));

      await teamController.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(leagueService.findLeagueID).toHaveBeenCalledWith('League Y', 'Country Z');
      expect(pool.query).toHaveBeenCalledWith( // Ensure the insert was attempted
        'INSERT INTO teams (name, league_id) VALUES ($1, $2) RETURNING *',
        ['Team X', 1]
      );
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(console.error).toHaveBeenCalled();
    }));
  });
});