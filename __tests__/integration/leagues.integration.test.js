const request = require('supertest');
const mockLeaguesData = require('../../__fixtures__/leagues.json');
const { toTitleCase } = require('../../utils');

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

describe('Leagues API', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mockQuery.mockReset();
  });

  describe('GET /api/leagues', () => {
    it('should return a list of all leagues if no query parameters are provided', async () => {

      const mockLeagues = mockLeaguesData;
      mockQuery.mockResolvedValueOnce({ rows: mockLeagues });
      const response = await request(app).get('/api/leagues');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockLeagues);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM leagues ORDER BY created_at DESC', []);
    });

    it('should return a list of leagues filtered by country', async () => {
      const countryFilter = 'England';
      const filteredMockLeagues = mockLeaguesData.filter(l => l.country.toLowerCase() === 'england');
      mockQuery.mockResolvedValueOnce({ rows: filteredMockLeagues }); 
      
      const response = await request(app).get(`/api/leagues?country=${countryFilter}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(filteredMockLeagues);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE country = $1'), [countryFilter]);
    });

    it('should return an empty array if no leagues match the filter', async () => {
      const countryFilter = 'Neverland';
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get(`/api/leagues?country=${countryFilter}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE country = $1'), [countryFilter]);
    });

    it('should return 500 if database query fails', temporarilyMockConsoleError(async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB insert failed'));
      const response = await request(app).get('/api/leagues');

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    }));
  });

  describe('POST /api/leagues', () => {
    it('should create a new league and return it in Title Case', async () => {
      const newLeagueData = { name: 'ligue 1', country: 'france' };
      const titleCasedName = toTitleCase(newLeagueData.name);
      const titleCasedCountry = toTitleCase(newLeagueData.country);
      const createdLeague = { id: 5, name: titleCasedName, country: titleCasedCountry, created_at: new Date().toISOString() };
      mockQuery.mockResolvedValueOnce({ rows: [createdLeague] });

      const response = await request(app)
        .post('/api/leagues')
        .send(newLeagueData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual(createdLeague);
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING *',
        [titleCasedName, titleCasedCountry]
      );
    });

    it('should return 400 if country is missing', async () => {
      const response = await request(app)
        .post('/api/leagues')
        .send({ name: 'Bundesliga' });

      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ error: 'League name and country are required' });
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/leagues')
        .send({ country: 'Germany' });

      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ error: 'League name and country are required' });
    });

    it('should return 409 if league already exists (unique constraint)', async () => {
      const newLeagueData = { name: 'Premier League', country: 'England' };
      
      mockQuery.mockRejectedValueOnce({ code: '23505', message: 'unique constraint violation' });

      const response = await request(app)
        .post('/api/leagues')
        .send(newLeagueData);

      expect(response.statusCode).toBe(409);
      expect(response.body).toEqual({ error: `League with name "${newLeagueData.name}" already exists in "${newLeagueData.country}".` });
    });

    it('should return 500 if database query fails', temporarilyMockConsoleError(async () => {
      const newLeagueData = { name: 'League X', country: 'Country Y' };
      mockQuery.mockRejectedValueOnce(new Error('DB query failed'));
      const response = await request(app)
        .post('/api/leagues')
        .send(newLeagueData);

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    }));
  });
});