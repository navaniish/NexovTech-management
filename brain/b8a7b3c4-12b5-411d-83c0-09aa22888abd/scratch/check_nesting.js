
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\dnava\\OneDrive\\Desktop\\Nexovgen-management\\client\\src\\pages\\Settings.jsx', 'utf8');

function checkNesting(code) {
  let stack = [];
  let openTags = (code.match(/<[a-zA-Z0-9]+(?!:)/g) || []).map(t => t.slice(1));
  let closeTags = (code.match(/<\/[a-zA-Z0-9]+>/g) || []).map(t => t.slice(2, -1));
  
  console.log('Open tags count:', openTags.length);
  console.log('Close tags count:', closeTags.length);
  
  // This is a very crude check and won't handle self-closing tags correctly in all cases
  // or strings/comments, but it's a quick check for huge imbalances.
}

// Actually, let's just count the specific tags I was worried about.
const divOpen = (content.match(/<div/g) || []).length;
const divClose = (content.match(/<\/div>/g) || []).length;
console.log('div open:', divOpen, 'div close:', divClose);

const sectionOpen = (content.match(/<section/g) || []).length;
const sectionClose = (content.match(/<\/section>/g) || []).length;
console.log('section open:', sectionOpen, 'section close:', sectionClose);

const formOpen = (content.match(/<form/g) || []).length;
const formClose = (content.match(/<\/form>/g) || []).length;
console.log('form open:', formOpen, 'form close:', formClose);

const braceOpen = (content.match(/\{/g) || []).length;
const braceClose = (content.match(/\}/g) || []).length;
console.log('brace open:', braceOpen, 'brace close:', braceClose);
