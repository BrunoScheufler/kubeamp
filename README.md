# kubeamp

> ⚡️ amplified kubectl client

## features

Out of the box, kubeamp provides

- **config management**: Easily add your kubeconfigs to extend your default configuration
- **context switching**: Switch your current context
- **ctl switching**: Want to use a newer kubectl build or an alternative? Just set your base command and it will work out of the box (given that the same api is used)

## installation

```bash
# install using npm
npm i -g kubeamp

# install using yarn
yarn global add kubeamp
```

## usage

```bash
# kubeamp will pipe your input directly to kubectl
kubeamp describe pods/frontend # -> kubectl ... describe pods/frontend

# to configure kubeamp, execute
kubeamp setup
```
