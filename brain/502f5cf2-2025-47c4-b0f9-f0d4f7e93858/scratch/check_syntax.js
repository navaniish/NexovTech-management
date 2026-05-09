const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\dnava\\OneDrive\\Desktop\\Nexovgen-management\\client\\src\\pages\\Settings.jsx', 'utf8');

function checkBalance(str) {
    const stack = [];
    const open = ['{', '(', '['];
    const close = ['}', ')', ']'];
    for (let i = 0; i < str.length; i++) {
        if (open.includes(str[i])) stack.push(str[i]);
        else if (close.includes(str[i])) {
            const last = stack.pop();
            if (open.indexOf(last) !== close.indexOf(str[i])) {
                console.log(`Mismatch: ${last} and ${str[i]} at index ${i}`);
                return false;
            }
        }
    }
    if (stack.length > 0) {
        console.log(`Unclosed: ${stack}`);
        return false;
    }
    return true;
}

// Simple tag check (naive)
function checkTags(str) {
    const tags = [];
    const regex = /<(\/?[a-zA-Z0-9]+)/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
        const tag = match[1];
        if (['img', 'input', 'br', 'hr'].includes(tag)) continue;
        if (tag.startsWith('/')) {
            const last = tags.pop();
            if (last !== tag.slice(1)) {
                console.log(`Tag Mismatch: Expected </${last}> but found <${tag}>`);
                return false;
            }
        } else {
            tags.push(tag);
        }
    }
    if (tags.length > 0) {
        console.log(`Unclosed Tags: ${tags}`);
        return false;
    }
    return true;
}

console.log('Balance:', checkBalance(content));
console.log('Tags:', checkTags(content));
