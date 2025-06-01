const leagueService = require('../../services/leagueService');
const pool = require('../../db');

// Mock the db pool
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

describe('League Service', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  describe('findLeagueID', () => {
    it('should return league_id if a single league is found by name', async () => {
      const mockLeague = { id: 1, name: 'Premier League', country: 'England' };
      pool.query.mockResolvedValueOnce({ rows: [mockLeague] });

      const result = await leagueService.findLeagueID('Premier League', 'England');
      
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id, name, country FROM leagues WHERE name = $1',
        ['Premier League']
      );
      expect(result).toEqual({ league_id: 1 });
    });

    it('should return league_id if a single league is found with no country given', async () => {
      const mockLeague = { id: 1, name: 'Unique League', country: 'CountryX' };
      pool.query.mockResolvedValueOnce({ rows: [mockLeague] });

      const result = await leagueService.findLeagueID('Unique League', null);
      
      expect(result).toEqual({ league_id: 1 });
    });

    it('should return error if no league is found by name', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await leagueService.findLeagueID('NonExistent League', 'AnyCountry');
      
      expect(result).toEqual({ 
        errorDetail: { message: 'No league found with name: "NonExistent League"', status: 404 } 
      });
    });

    it('should return error if a single league is found but country does not match', async () => {
      const mockLeague = { id: 1, name: 'Premier League', country: 'England' };
      pool.query.mockResolvedValueOnce({ rows: [mockLeague] });

      const result = await leagueService.findLeagueID('Premier League', 'Spain');
      
      expect(result).toEqual({
        errorDetail: {
          message: 'League "Premier League" exists, but not in country "Spain". It is in "England".',
          status: 404
        }
      });
    });

    it('should return error if multiple leagues are found by name and no country provided', async () => {
      const mockLeagues = [
        { id: 1, name: 'Common League', country: 'CountryA' },
        { id: 2, name: 'Common League', country: 'CountryB' },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockLeagues });

      const result = await leagueService.findLeagueID('Common League', null); // No country provided
      
      expect(result).toEqual({
        errorDetail: {
          message: 'Multiple leagues exist with name "Common League". Please provide league_country to specify.',
          status: 400
        }
      });
    });

    it('should return league_id if multiple leagues are found by name but specified country matches one', async () => {
      const mockLeagues = [
        { id: 1, name: 'Common League', country: 'CountryA' },
        { id: 2, name: 'Common League', country: 'CountryB' },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockLeagues });

      const result = await leagueService.findLeagueID('Common League', 'CountryB');
      
      expect(result).toEqual({ league_id: 2 });
    });

    it('should return error if multiple leagues are found by name and specified country does not match', async () => {
      const mockLeagues = [
        { id: 1, name: 'Common League', country: 'CountryA' },
        { id: 2, name: 'Common League', country: 'CountryB' },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockLeagues });

      const result = await leagueService.findLeagueID('Common League', 'CountryC');
      
      expect(result).toEqual({
        errorDetail: {
          message: 'League "Common League" found, but not in country "CountryC". Available in: CountryA, CountryB.',
          status: 404
        }
      });
    });
  });
});