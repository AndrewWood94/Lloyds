const pool = require('../db'); 

async function findLeagueID(leagueName, leagueCountry) {
  const {rows: existingLeaguesByName } = await pool.query(
    'SELECT id, name, country FROM leagues WHERE name = $1',
    [leagueName]
  );

  //No leagues found with name
  if (existingLeaguesByName.length === 0) {
    return { 
      errorDetail: { 
        message: `No league found with name: "${leagueName}"`, 
        status: 404, 
      } 
    }
  };

  //One league found with name
  if (existingLeaguesByName.length === 1) {
    const foundLeague = existingLeaguesByName[0];
    // If a country was provided for the team's league, it must match the found league's country
    if (leagueCountry && leagueCountry.toLowerCase() !== foundLeague.country.toLowerCase() ) {
      return {
        errorDetail: {
          message: `League "${leagueName}" exists, but not in country "${leagueCountry}". It is in "${foundLeague.country || 'N/A'}".`,
          status: 404,
        }
      };
    }
    // Country matches or not specified so it is the right league
    return { league_id: foundLeague.id };
  }

  // Multiple leagues found with the same name
  
  // If no country is given
  if (!leagueCountry) {
    return {
      errorDetail: {
        message: `Multiple leagues exist with name "${leagueName}". Please provide league_country to specify.`,
        status: 400, 
      }
    };
  }
  
  // Select the league that matches the country given
  const specificLeague = existingLeaguesByName.find(
    l => l.country && l.country.toLowerCase() === leagueCountry.toLowerCase()
  );

  // Country given doesn't match existing league countries
  if (!specificLeague) {
    const availableCountries = existingLeaguesByName.map(l => l.country).filter(Boolean).join(', ');
    return {
      errorDetail: {
        message: `League "${leagueName}" found, but not in country "${leagueCountry}". Available in: ${availableCountries || 'N/A'}.`,
        status: 404,
      }
    };
  }

  // Return matched league
  return { league_id: specificLeague.id };

}

module.exports = { findLeagueID };
