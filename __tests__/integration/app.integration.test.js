const request = require('supertest');
const app = require('../../index');

describe('API Endpoints', () => {
  
  describe('GET /api (Welcome Endpoint)', () => {
    it('should return a 200 OK status and the correct welcome message', async () => {
      const response = await request(app).get('/api');
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({ message: 'Welcome to the API to track football leagues and teams!' });
    });
  });

  describe('GET /api-docs (API Documentation Endpoint)', () => {
    it('should return a 200 OK status and HTML content', async () => {
      const response = await request(app).get('/api-docs/');
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toBeTruthy(); 
      expect(response.text).toContain('<title>Swagger UI</title>');
    });
  });
});