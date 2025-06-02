// Helper for mock Express response
global.mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to temporarily mock console.error for expected error logs
global.temporarilyMockConsoleError = (testFn) => {
  return async (...args) => {
    const originalError = console.error;
    console.error = jest.fn();
    try {
      await testFn(...args);
    } catch (err) {
      // Re-throw error so Jest knows the test might have failed for other reasons
      // if the error wasn't the one expected to be caught by the controller
      throw err;
    } finally {
      console.error = originalError;
    }
  };
};