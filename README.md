# Four Colors

-------------------

## Local Testing

docker build --no-cache --build-arg GIT_BRANCH=build-idea -t four-colors-test .
docker run -p 8080:80 four-colors-test

## For Actions 

Public access is in the src folder only

Install on D.O when master branch updated

Secrets needed:

* REGISTRY_NAME
* DIGITALOCEAN_ACCESS_TOKEN
* CLUSTER_NAME


