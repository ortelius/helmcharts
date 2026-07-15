# Ortelius Helm Charts

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/ortelius/helmcharts)

This repository hosts the Helm charts for [Ortelius](https://ortelius.io), an open-source continuous security intelligence platform for decoupled architectures. Ortelius ingests SBOMs at build time, matches deployed components against the OSV vulnerability database, and tracks every CVE from introduction through remediation across all of your clusters and logical applications — from a single dashboard.

* [Overview of Ortelius](https://ortelius.io)
* [Documentation](https://docs.ortelius.io)
* [Chart on ArtifactHub](https://artifacthub.io/packages/helm/ortelius/ortelius)

## Charts

| Chart | Purpose |
|---|---|
| [`ortelius`](charts/ortelius) | Umbrella chart for the full application stack (ArangoDB, backend API, frontend, and scheduled scanner jobs) |

See the [`ortelius` chart README](charts/ortelius/README.md) for installation instructions, including a Kind quick start and a production install via [Terraform + FluxCD](https://github.com/ortelius/platform-iac).

## Install with Helm

```console
helm repo add ortelius https://ortelius.github.io/helmcharts
helm install my-release ortelius/ortelius
```

## Install with Terraform

[github.com/ortelius/platform-iac](https://github.com/ortelius/platform-iac) provisions the underlying infrastructure (EKS or GKE), bootstraps FluxCD, and hands off the Helm release above to it for ongoing GitOps-managed upgrades. See the [Self-Hosted guide](https://docs.ortelius.io/guides/start-here/choose-your-path/self-hosted/) for the full walkthrough.

## Support

* [Issues Tracking](https://github.com/ortelius/helmcharts/issues)
* [Online User Guide](https://docs.ortelius.io)