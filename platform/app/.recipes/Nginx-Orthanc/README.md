# Docker compose files

# Build

Using docker compose you can build the image with the following command:

```bash
docker-compose build
```

# Run

To run the container use the following command:

```bash
docker-compose up
```

# Troubleshooting

If the builder fails with `/bin/sh: 1: cross-env: not found`, the build stage is
installing production-only dependencies. The OHIF viewer build needs workspace
devDependencies during image creation, so use:

```bash
yarn install --frozen-lockfile --production=false
```

This keeps build-time packages such as `cross-env` and webpack plugins
available before `yarn run build`.


# Routes

http://localhost/ -> OHIF
localhost/pacs -> Orthanc


See [here](../../../docs/docs/deployment/nginx--image-archive.md) for more information about this recipe.
