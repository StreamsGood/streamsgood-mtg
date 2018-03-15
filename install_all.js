const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

const npm = os.platform().startsWith('win') ? 'npm.cmd' : 'npm';
const bower = os.platform().startsWith('win') ? 'bower.cmd' : 'bower';

const folders = fs.readdirSync(__dirname);

folders.forEach(folder => {
	const dir = path.join(__dirname, folder);

	console.log(`Attempting to install dependencies in ${dir}`);

	if (fs.existsSync(path.join(dir, 'package.json'))) {
		cp.spawn(npm, ['install'], { env: process.env, cwd: dir, stdio: 'inherit' });
	}

	if (fs.existsSync(path.join(dir, 'bower.json'))) {
		cp.spawn(bower, ['install'], { env: process.env, cwd: dir, stdio: 'inherit' });
	}
});
