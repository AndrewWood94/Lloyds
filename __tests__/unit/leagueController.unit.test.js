const leagueController = require('../../controllers/leagueController');
const pool = require('../../db');
const { toTitleCase } = require('../../utils'); 

// Mock the db pool
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

// Mock the utils
jest.mock('../../utils', () => ({
    toTitleCase: jest.fn(str => str),
  }));

describe('League Controller', () => {
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

    describe('getLeagues', () => {
        it('should return all leagues when no country is specified', async () => {
          const mockLeagues = [
            { id: 1, name: 'premier league', country: 'england', created_at: new Date() },
            { id: 2, name: 'la liga', country: 'spain', created_at: new Date() },
          ];
          pool.query.mockResolvedValueOnce({ rows: mockLeagues });
    
          await leagueController.getLeagues(req, res);
    
          expect(pool.query).toHaveBeenCalledWith('SELECT * FROM leagues ORDER BY created_at DESC', []);
          expect(toTitleCase).toHaveBeenCalledWith('premier league');
          expect(toTitleCase).toHaveBeenCalledWith('england');
          expect(toTitleCase).toHaveBeenCalledWith('la liga');
          expect(toTitleCase).toHaveBeenCalledWith('spain');
          expect(res.json).toHaveBeenCalledWith(
            mockLeagues.map(l => ({
              ...l,
              name: toTitleCase(l.name),
              country: toTitleCase(l.country),
            }))
          );
        });
    
        it('should return leagues filtered by country (case-insensitive)', async () => {
          req.query = { country: 'ENGLAND' };
          const mockFilteredLeagues = [
            { id: 1, name: 'premier league', country: 'england', created_at: new Date() },
          ];
          pool.query.mockResolvedValueOnce({ rows: mockFilteredLeagues });
    
          await leagueController.getLeagues(req, res);
    
          expect(pool.query).toHaveBeenCalledWith(
            'SELECT * FROM leagues WHERE country = $1 ORDER BY created_at DESC',
            ['ENGLAND']
          );
          expect(toTitleCase).toHaveBeenCalledWith('premier league');
          expect(toTitleCase).toHaveBeenCalledWith('england');
          expect(res.json).toHaveBeenCalledWith(
            mockFilteredLeagues.map(l => ({
              ...l,
              name: toTitleCase(l.name),
              country: toTitleCase(l.country),
            }))
          );
        });
    
        it('should return an empty array if no leagues match the filter', async () => {
          req.query = { country: 'Neverland' };
          pool.query.mockResolvedValueOnce({ rows: [] });
    
          await leagueController.getLeagues(req, res);
    
          expect(pool.query).toHaveBeenCalledWith(
            'SELECT * FROM leagues WHERE country = $1 ORDER BY created_at DESC',
            ['Neverland']
          );
          expect(res.json).toHaveBeenCalledWith([]);
        });
    
        it('should return 500 on database error', temporarilyMockConsoleError(async () => {
          pool.query.mockRejectedValueOnce(new Error('DB Query Failed'));
    
          await leagueController.getLeagues(req, res);
    
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
          expect(console.error).toHaveBeenCalled();
        }));
      });
    
      describe('createLeague', () => {
        it('should create a league successfully and return 201', async () => {
          req.body = { name: 'new league', country: 'new country' };
          const createdLeague = { id: 3, name: 'new league', country: 'new country', created_at: new Date() };
          pool.query.mockResolvedValueOnce({ rows: [createdLeague] });
        
          await leagueController.createLeague(req, res);
    
          expect(toTitleCase).toHaveBeenCalledWith('new league');
          expect(toTitleCase).toHaveBeenCalledWith('new country');
          expect(pool.query).toHaveBeenCalledWith(
            'INSERT INTO leagues (name, country) VALUES ($1, $2) RETURNING *',
            ['new league', 'new country']
          );
          expect(res.status).toHaveBeenCalledWith(201);
          expect(res.json).toHaveBeenCalledWith(createdLeague);
        });
    
        it('should return 400 if league name is missing', async () => {
          req.body = { country: 'Some Country' };
          await leagueController.createLeague(req, res);
    
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ error: 'League name and country are required' });
          expect(pool.query).not.toHaveBeenCalled();
        });
    
        it('should return 400 if league country is missing', async () => {
          req.body = { name: 'Some League' };
          await leagueController.createLeague(req, res);
    
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ error: 'League name and country are required' });
          expect(pool.query).not.toHaveBeenCalled();
        });
    
        it('should return 409 if league already exists', temporarilyMockConsoleError(async () => {
          req.body = { name: 'Existing League', country: 'Existing Country' };
          const dbError = new Error('Unique constraint failed');
          dbError.code = '23505'; // PostgreSQL unique violation error code
          pool.query.mockRejectedValueOnce(dbError);
    
          await leagueController.createLeague(req, res);
    
          expect(res.status).toHaveBeenCalledWith(409);
          expect(res.json).toHaveBeenCalledWith({ error: 'League with name "Existing League" already exists in "Existing Country".' });
          expect(console.error).not.toHaveBeenCalled(); 
        }));
    
        it('should return 500 for other database errors during creation', temporarilyMockConsoleError(async () => {
          req.body = { name: 'League X', country: 'Country Y' };
          pool.query.mockRejectedValueOnce(new Error('Generic DB Error'));
    
          await leagueController.createLeague(req, res);
    
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
          expect(console.error).toHaveBeenCalled();
        }));
      });
    });