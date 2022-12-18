Basic Static Site Template

        docker build --no-cache -t baby-hex .
        docker tag baby-hex registry.digitalocean.com/will-k8s/baby-hex
        docker push registry.digitalocean.com/will-k8s/baby-hex
        k create -f baby-hex.deployment.yaml

 see https://docs.digitalocean.com/products/kubernetes/how-to/deploy-using-github-actions/       