const pool = require('../db'); // Import the shared pool

async function findLeagueID(leagueName, leagueCountry) {
  const existingLeaguesByName = await pool.query(
    'SELECT id, name, country FROM leagues WHERE name = $1',
    [leagueName]
  );
  if (existingLeaguesByName.rows.length === 0) {
    return { errorDetail: { message: `No league found with name: "${leagueName}"`, status: 404 } };
  }

  else if (existingLeaguesByName.rows.length === 1) {
    const foundLeague = existingLeaguesByName.rows[0];
    // If a country was provided for the team's league, it must match the found league's country
    if (leagueCountry && leagueCountry !== foundLeague.country ) {
      return {
        errorDetail: {
          message: `League "${leagueName}" exists, but not in country "${leagueCountry}". It is in "${foundLeague.country || 'N/A'}".`,
          status: 404
        }
      };
    }
    return { league_id: foundLeague.id };
  }

  else{
    // Multiple leagues found with the same name, country is required for disambiguation
    if (!leagueCountry) {
      return {
        errorDetail: {
          message: `Multiple leagues exist with name "${leagueName}". Please provide league_country to specify.`,
          status: 400 // Bad request, as more info is needed
        }
      };
    }
  }

  const specificLeague = existingLeaguesByName.rows.find(
    l => l.country && l.country === leagueCountry
  );

  if (!specificLeague) {
    const availableCountries = existingLeaguesByName.rows.map(l => l.country).filter(Boolean).join(', ');
    return {
      errorDetail: {
        message: `League "${leagueName}" found, but not in country "${leagueCountry}". Available in: ${availableCountries || 'N/A'}.`,
        status: 404
      }
    };
  }
  return { league_id: specificLeague.id };

}

module.exports = { findLeagueID };
