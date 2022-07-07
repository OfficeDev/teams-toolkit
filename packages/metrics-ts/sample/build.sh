cd ..
npm run build

cd -
npx tsc -p .
npx node ./build/index.js
