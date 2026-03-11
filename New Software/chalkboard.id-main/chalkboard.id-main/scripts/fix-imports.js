const fs = require('fs');
const path = require('path');

const badImports = JSON.parse(fs.readFileSync('bad-imports.json', 'utf8'));

for (const line of badImports) {
    const fileMatch = line.match(/^File: (.*?)$/m);
    const importMatch = line.match(/^Invalid Import Case: (.*?)$/m);
    if (!fileMatch || !importMatch) continue;
    
    const file = fileMatch[1].trim();
    const badImport = importMatch[1].trim();
    
    let replacement = badImport;
    if (badImport.includes('shared/CardBox')) {
        replacement = '@/components/shared/CardBox';
    } else if (badImport.includes('Default-Ui/button')) {
        replacement = '@/components/shadcn-ui/Default-Ui/button';
    } else if (badImport === './MyLink' && file.includes('headless-ui\\Disclosure\\Code')) {
        replacement = '../MyLink';
    } else if (badImport === './MyLink' && file.includes('headless-ui\\Popover\\Code')) {
        replacement = '../MyLink';
    } else if (badImport.includes('ComboWithLableCode')) {
        replacement = './ComboWithLableCode';
    }
    
    if (replacement !== badImport) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(new RegExp(`['"]${badImport}['"]`, 'g'), `"${replacement}"`);
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Replaced in ${file}:\n- ${badImport}\n+ ${replacement}`);
    }
}
