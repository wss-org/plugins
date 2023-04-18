# `npm-publish`

> TODO: description

## Usage


```
- plugin: "@serverless-cd/cache"
	name: my-cache
  env:
    ACCESS_KEY_ID: ff
    SECRET_ACCESS_KEY:ggg
  	REGION: xx
    BUCKET: xyxy
  inputs:
  	key: ${{ env.cache-name }}-${{ hashFiles('./package-lock.json') }}
  	ratio: 70%
    path: 
			- ~/.npm
```
