const toTitleCase = (str) => {
    if (!str) return str;
    let titleCased = str.toString().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    titleCased = titleCased.replace(/-(\w)/g, (match, charAfterHyphen) => `-${charAfterHyphen.toLowerCase()}`);
    titleCased = titleCased.replace(/(\w)'(\w)/g, (match, charBeforeApostrophe, charAfterApostrophe) => `${charBeforeApostrophe}'${charAfterApostrophe.toLowerCase()}`);
    return titleCased;
  };
  
  module.exports = { toTitleCase };