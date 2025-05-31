const request = require('supertest');
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


describe('Leagues API', () => {
    beforeEach(() => {
      // Reset the mock before each test
      mockQuery.mockReset();
    });
  
    describe('GET /api/leagues', () => {
      it('should return a list of leagues', async () => {

        const mockLeagues = mockLeaguesData;
        mockQuery.mockResolvedValueOnce({ rows: mockLeagues });
        const response = await request(app).get('/api/leagues');
  
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(mockLeagues);
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM leagues ORDER BY created_at DESC');
      });
  
      it('should return 500 if database query fails', async () => {
        mockQuery.mockRejectedValueOnce(new Error('DB query failed'));
        const response = await request(app).get('/api/leagues');
  
        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({ error: 'Internal server error' });
      });
    });
  
    describe('POST /api/leagues', () => {
      it('should create a new league and return it', async () => {
        const newLeagueData = { name: 'Ligue 1', country: 'France' };
        const createdLeague = { id: 3, ...newLeagueData, created_at: new Date().toISOString() };
        mockQuery.mockResolvedValueOnce({ rows: [createdLeague] });
  
        const response = await request(app)
          .post('/api/leagues')
          .send(newLeagueData);
  
        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual(createdLeague);
        expect(mockQuery).toHaveBeenCalledWith(
          'INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING *',
          [newLeagueData.name, newLeagueData.country]
        );
      });
  
      it('should return 400 if name or country is missing', async () => {
        const response = await request(app)
          .post('/api/leagues')
          .send({ name: 'Bundesliga' });
  
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
        expect(response.body).toEqual({ error: 'League with this name already exists in this country.' });
      });
    });
  });