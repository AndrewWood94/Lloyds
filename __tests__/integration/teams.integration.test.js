const request = require('supertest');
const mockTeamsData = require('../../__fixtures__/teams.json'); // Import mock data
const mockLeaguesData = require('../../__fixtures__/leagues.json'); // Import mock data

let mockQuery;

jest.mock('pg', () => {
  const actualPg = jest.requireActual('pg');
  mockQuery = jest.fn();
  return {
    ...actualPg,
    Pool: jest.fn(() => ({
      query: mockQuery,
      connect: jest.fn().mockResolvedValue({
        release: jest.fn(),
      }),
      end: jest.fn().mockResolvedValue(),
    })),
  };
});

const app = require('../../index');

describe('Teams API', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mockQuery.mockReset();
  });

  describe('GET /api/teams', () => {

    it('should return a list of all teams if no query parameters are provided', async () => {
      const mockTeams = mockTeamsData;
      mockQuery.mockResolvedValueOnce({ rows: mockTeams });
      const response = await request(app).get('/api/teams');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockTeams);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT t.id, t.name AS team_name, t.created_at, l.name AS league_name, l.country AS league_country'), []);
    });

    it('should return a list of teams filtered by country', async () => {
      const countryFilter = 'England';
      const mockTeams = mockTeamsData.filter(t => t.league_country.toLowerCase() === 'england');
      mockQuery.mockResolvedValueOnce({ rows: mockTeams });
      const response = await request(app).get(`/api/teams?country=${countryFilter}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockTeams);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining(`WHERE l.country = $1`), [countryFilter]);
    });

    it('should return a list of teams filtered by league name', async () => {
      const leagueFilter = 'serie A';
      const mockTeams = mockTeamsData.filter(t => t.league_name.toLowerCase() === 'serie A');
      mockQuery.mockResolvedValueOnce({ rows: mockTeams });
      const response = await request(app).get(`/api/teams?league_name=${leagueFilter}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockTeams);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining(`WHERE l.name = $1`), [leagueFilter]);
    });

    it('should return a list of teams filtered by league name and country', async () => {
      const leagueFilter = 'serie A';
      const countryFilter = 'Brazil';
      let mockTeams = mockTeamsData.filter(t => t.league_name.toLowerCase() === 'serie a');
      mockTeams = mockTeams.filter(t => t.league_country.toLowerCase() === 'brazil');
      mockQuery.mockResolvedValueOnce({ rows: mockTeams });
      const response = await request(app).get(`/api/teams?country=${countryFilter}&league_name=${leagueFilter}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockTeams);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining(`WHERE l.country = $1 AND l.name = $2` ), [countryFilter, leagueFilter]);
    });

    it('should return an empty array if no teams match the filter', async () => {
      const countryFilter = 'Neverland';
      const mockTeams = mockTeamsData.filter(t => t.league_country.toLowerCase() === 'neverland');
      mockQuery.mockResolvedValueOnce({ rows: mockTeams });

      const response = await request(app).get(`/api/teams?country=${countryFilter}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining(`WHERE l.country = $1`), [countryFilter]);
    });

    it('should return 500 if database query fails', temporarilyMockConsoleError(async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB query failed'));
      const response = await request(app).get('/api/teams');

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    }));
  });

  describe('POST /api/teams', () => {
    it('should create a new team and return it', async () => {
      const newTeamData = { name: 'New FC', league_name: 'Premier League', league_country: 'England' };
      const mockFoundLeague = mockLeaguesData.find(l => l.name.toLowerCase() === newTeamData.league_name.toLowerCase() && l.country.toLowerCase() === newTeamData.league_country.toLowerCase());
      const createdTeam = { id: 5, name: newTeamData.name, league_id: mockFoundLeague.id, created_at: new Date().toISOString() };
      mockQuery
        .mockResolvedValueOnce({ rows: [mockFoundLeague] })
        .mockResolvedValueOnce({ rows: [createdTeam] });

      const response = await request(app)
        .post('/api/teams')
        .send(newTeamData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual(createdTeam);
      expect(mockQuery.mock.calls[0]).toEqual(['SELECT id, name, country FROM leagues WHERE name = $1',[newTeamData.league_name]]);
      expect(mockQuery.mock.calls[1]).toEqual(['INSERT INTO teams (name, league_id) VALUES ($1, $2) RETURNING *',[newTeamData.name, mockFoundLeague.id]]);
    });

    it('should return 400 if team name is missing', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({ league_name: 'Some League', league_country: 'Some Country' });

      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ error: 'Team name is required' });
    });

    it('should return 400 if league_name is missing', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({ name: 'Some Team', league_country: 'Some Country' });

      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ error: 'League name is required to associate the team.' });
    });

    it('should return 404 if league is not found by leagueService.findLeagueID', async () => {
      const newTeamData = { name: 'Missing FC', league_name: 'No League', league_country: 'Nowhere' };

      mockQuery.mockResolvedValueOnce({ rows: [] }); 

      const response = await request(app)
        .post('/api/teams')
        .send(newTeamData);
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({ error: `No league found with name: "${newTeamData.league_name}"` });
    });

    it('should return 400 if multiple leagues exist with the same name and no country is provided', async () => {
      const newTeamData = { name: 'New Team FC', league_name: 'Serie A' };
      const mockFoundLeague = mockLeaguesData.filter(l => l.name.toLowerCase() === newTeamData.league_name.toLowerCase());

      mockQuery.mockResolvedValueOnce({ rows: mockFoundLeague }); 

      const response = await request(app)
      .post('/api/teams')
      .send(newTeamData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ error: `Multiple leagues exist with name "${newTeamData.league_name}". Please provide league_country to specify.` });
    });

    it('should return 409 if team already exists in the league (unique constraint)', temporarilyMockConsoleError(async () => {
      const existingTeamData = { name: 'Arsenal', league_name: 'Premier League', league_country: 'England' };
      const mockFoundLeague = mockLeaguesData.find(l => l.name.toLowerCase() === existingTeamData.league_name.toLowerCase() && l.country.toLowerCase() === existingTeamData.league_country.toLowerCase());
      
      mockQuery.mockResolvedValueOnce({ rows: [mockFoundLeague] });
      mockQuery.mockRejectedValueOnce({ code: '23505', message: 'unique constraint violation' }); // For INSERT team

      const response = await request(app)
        .post('/api/teams')
        .send(existingTeamData);

      expect(response.statusCode).toBe(409);
      expect(response.body).toEqual({ error: `Team with name "${existingTeamData.name}" already exists in this league.` });
      expect(console.error).not.toHaveBeenCalled();
    }));

    it('should return 500 if database query fails during team insert', temporarilyMockConsoleError(async () => {
      const newTeamData = { name: 'Error FC', league_name: 'Premier League', league_country: 'England' };
      const mockFoundLeague = mockLeaguesData.find(l => l.name.toLowerCase() === newTeamData.league_name.toLowerCase() && l.country.toLowerCase() === newTeamData.league_country.toLowerCase());

      mockQuery.mockResolvedValueOnce({ rows: [mockFoundLeague] }); 
      mockQuery.mockRejectedValueOnce(new Error('DB insert failed')); 

      const response = await request(app)
        .post('/api/teams')
        .send(newTeamData);

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
      expect(console.error).toHaveBeenCalled();
    }));
  });
});

