# Publish version

assuming that we want to switch to tag "0.1.0"

- lint -> `npm run lint`
- test -> `npm run test`
- build -> `npm run build`
- increase version in `package.json` to "0.1.0"
- add -> `git add .`
- commit -> `git commit -m "feat: ..., fix: ..., chore: ..."`
- generate changelog -> `npm run create-changelog`
- commit changes in CHANGELOG.md to the last commit -> `git commit --amend --no-edit`
- tag -> `git tag v0.1.0`
- push -> `git push` and `git push --tags`
- publish `npm publish`
