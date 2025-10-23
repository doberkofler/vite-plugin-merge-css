# Publish version

assuming that we want to switch to tag "0.1.0"

- lint -> `npm run lint`
- test -> `npm run test`
- build -> `npm run build`
- increase version in `package.json` to "0.1.0"
- commit -> `git commit -m "feat: ..., fix: ..., chore: ..."`
- tag -> `git tag v0.1.0`
- generate changelog -> `npm run create-changelog`
- tag again -> `git tag -d v0.1.0` & `git tag v0.1.0`
- push -> `git push` and `git push --tags`
- publish `npm publish`
