const path = require('path');
const {
  src,
  series
} = require('gulp');
const gulpInstall = require('gulp-install');
const directoryHelper = require('../../tools/directoryHelper.js');
const fileHelper = require('../../tools/fileHelper.js');
const assert = require('../../tools/assert.js');
const _ = require('../../tools/utils.js');

const distPackageJsonPath = path.resolve('dist', 'package.json');
const miniprogramNpmPath = path.resolve('dist', 'miniprogram_npm');
const nodeModulesPath = path.resolve('dist', 'node_modules');

const copyPackageJson = async () => {
  const packageJson = _.readJson(path.resolve('package.json'));
  const dependencies = packageJson.dependencies || {};
  await _.writeFile(distPackageJsonPath, JSON.stringify({
    dependencies
  }, null, '\t'));
};

const npmInstall = () => {
  return src(distPackageJsonPath)
    .pipe(gulpInstall({
      production: true
    }));
};

/**
 * @description copy package / find package's entry
 * @author Jerry Cheng
 * @date 2019-03-15
 * @param {*} sourceFileName
 */
async function packageHander(sourceFileName) {
  const jsonSourcePath = path.resolve(nodeModulesPath, sourceFileName); // PackageJson Source
  const hackFilePath = sourceFileName.replace(/\/node_modules/, '');
  // const jsonDestPath = path.resolve(miniprogramNpmPath, hackFilePath); // PackageJson Copy
  // await fileHelper.copy(jsonSourcePath, jsonDestPath);

  // Dependency Copy
  const packageJson = require(jsonSourcePath);
  const dependencyDir = path.dirname(sourceFileName);
  const dependencySourcePath = path.resolve(nodeModulesPath, dependencyDir, packageJson.main); // 依赖源
  const hackDirPath = path.dirname(hackFilePath);
  const dependencyDestPath = path.resolve(miniprogramNpmPath, hackDirPath, packageJson.main);

  // 宝玩微信小程序纯js模块 宝玩微信小程序自定义组件 微信小程序自定义组件
  if (packageJson['miniprogram'] && packageJson['miniprogram'] === 'miniprogram_dist') {
    const miniprogramDistPath = path.resolve(nodeModulesPath, dependencyDir, 'miniprogram_dist');
    const relative = dependencyDir + '/miniprogram_dist';
    const priority = 2;
    try {
      await recursive(priority, relative, miniprogramDistPath, copyFile);
    } catch (error) {
      assert.error(error);
    }
  } else {
    // 主入口为main/index.js的三方库
    await fileHelper.copy(dependencySourcePath, dependencyDestPath);
  }
}

/**
 * @description copyFile 拷贝文件
 * @author Jerry Cheng
 * @date 2019-03-15
 * @param {*} sourceFileName
 */
async function copyFile(sourceFileName) {
  const sourcePath = path.resolve(nodeModulesPath, sourceFileName); // packageJson源地址
  const destPath = path.resolve(miniprogramNpmPath, sourceFileName);
  await fileHelper.copy(sourcePath, destPath);
}

// 只解析package.json
const recursive = async (priority, relative, dir, handler) => {
  const dirents = await directoryHelper.read(dir, {
    withFileTypes: true
  });
  const promises = dirents.map(async dirent => {
    const direntName = dirent.name;
    if (dirent.isDirectory()) {
      await recursive(priority, path.join(relative, direntName), path.resolve(dir, direntName), handler);
    } else if (dirent.isFile()) {
      if (priority === 1) {
        if (direntName === 'package.json') {
          await handler(path.join(relative, direntName));
        }
      } else {
        await handler(path.join(relative, direntName));
      }
    }
  });
  await promises;
};

// 重组node_modules
const recombine = async () => {
  const relative = '';
  const priority = 1;
  await recursive(priority, relative, nodeModulesPath, packageHander);
};

const install = series(copyPackageJson, npmInstall, recombine);
// const install = series(recombine);

module.exports = install;
