# Ortelius

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/ortelius/helmcharts)

Ortelius is a central evidence store of all your security and DevOps intelligence. It provides comprehensive, end-to-end insights across all of your clusters and logical applications from a single dashboard: microservice and application-level SBOMs, CVEs, deployed inventory, application-to-microservice dependencies, impact analysis, application versions, and open-source package usage across the organization.

[Overview of Ortelius](https://ortelius.io)
[Documentation](https://docs.ortelius.io)

## Additional Information

This chart deploys all of the required secrets, services, and deployments on a [Kubernetes](https://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager. It is an umbrella chart made up of the following subcharts:

| Subchart | Purpose |
|---|---|
| `arangodb` | ArangoDB database used as the evidence store |
| `ortelius` | Core API / backend microservice |
| `frontend` | Web UI |
| `osvdev-job` | Scheduled job that syncs OSV vulnerability data |
| `relscanner-job` | Scheduled job that scans releases for SBOM/CVE data |

## Prerequisites

* Kubernetes 1.19+
* Helm 3.2.0+

## Quick Start (Kind cluster)

1. Cluster config - `cluster.yaml`

    ```yaml
    kind: Cluster
    apiVersion: kind.x-k8s.io/v1alpha4
    nodes:
    - role: control-plane
      kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
      extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
    ```

2. Create the cluster

    ```console
    kind create cluster --config cluster.yaml -n ortelius
    ```

3. Connect to the cluster

    ```console
    kubectl cluster-info --context kind-ortelius
    ```

4. Add the repo and install Ortelius

    ```console
    ORTELIUS_VERSION=12.0.333
    helm repo add ortelius https://ortelius.github.io/helmcharts/
    helm repo update
    helm upgrade --install my-release ortelius/ortelius \
      --set arangodb.arangodb_pass=my_db_password \
      --version "${ORTELIUS_VERSION}" \
      --namespace ortelius --create-namespace
    ```

    > Note: this uses the bundled ArangoDB dependency. See [Parameters](#parameters) below to point at an external ArangoDB instance instead.

5. Access the Ortelius UI

    ```console
    kubectl port-forward svc/frontend 8080:80 -n ortelius
    ```

    Then open `http://localhost:8080`.

## Installing on Google GKE or AWS EKS

The steps above work for a quick local evaluation. For a real GKE or EKS cluster — including VPC/networking, ingress, DNS, TLS certificates, and GitOps-based upgrades via FluxCD — use the [`platform-iac`](https://github.com/ortelius/platform-iac) repository instead of installing this chart by hand. It wraps this chart with Terraform + FluxCD so the cluster, the ingress/DNS/cert plumbing, and the Ortelius `HelmRelease` are all provisioned and kept in sync together.

```console
git clone https://github.com/ortelius/platform-iac
cd platform-iac
export TF_VAR_github_token="ghp_..."   # GitHub PAT with repo + admin:public_key scopes
./terraform/deploy.sh eks apply        # or: ./terraform/deploy.sh gke apply
```

`deploy.sh` will prompt you for the application secrets (ArangoDB password, SMTP credentials, GitHub OAuth app details, etc.), encrypt them with SOPS, and commit them to the repo before bootstrapping Flux. See the [platform-iac README](https://github.com/ortelius/platform-iac#files-to-update-before-deploying) for the full walkthrough, including the DNS/ACM follow-up steps for EKS.

Before running `deploy.sh`, review and edit the relevant `terraform.tfvars` file:

### `terraform/eks/terraform.tfvars`

| Variable | Description | Required |
|---|---|---|
| `aws_region` | AWS region for the cluster | Yes |
| `cluster_name` | EKS cluster name | Yes |
| `vpc_cidr` | VPC CIDR block | Yes |
| `domain` | Domain used for the ACM cert and ingress | Yes |
| `github_org` / `github_repo` | GitOps repo Flux bootstraps against (`ortelius` / `platform-iac`) | Yes |
| `dns_provider` | `cloudflare` or `route53` | Yes |
| `dns_zone_name` | Parent DNS zone for the cluster domain | Yes |
| `cloudflare_api_token` | Required only when `dns_provider = cloudflare` (or set `TF_VAR_cloudflare_api_token`) | Conditional |
| `github_token` | GitHub PAT, passed via `TF_VAR_github_token` env var — do **not** commit this | Yes (env var) |

### `terraform/gke/terraform.tfvars`

| Variable | Description | Required |
|---|---|---|
| `project_id` | GCP project ID | Yes |
| `region` | GCP region | Yes |
| `cluster_name` | GKE cluster name | Yes |
| `domain` | Application domain (used by `deploy.sh`/DNS output) | Yes |
| `github_org` / `github_repo` | GitOps repo Flux bootstraps against | Yes |
| `node_locations` | Zones for GKE nodes, e.g. `["us-central1-a"]` | No (defaults to `["us-central1-a"]`) |
| `github_token` | GitHub PAT, passed via `TF_VAR_github_token` env var | Yes (env var) |

### `terraform/gke-2/terraform.tfvars` (standing up a second/parallel GKE cluster)

Same variables as `gke`, plus:

| Variable | Description | Required |
|---|---|---|
| `gitops_path` | Directory under `clusters/` in the GitOps repo that Flux watches for this cluster (`clusters/<gitops_path>`). Defaults to `cluster_name`, but must be set explicitly when running a second cluster in parallel so the two clusters don't reconcile from the same path. | Yes, when running alongside another cluster |
| `node_min_count` / `node_max_count` | Node pool autoscaler bounds | No (default `1` / `3`) |

## Parameters

### Common parameters

| Name | Description | Value |
|------|-------------|-------|
| `arangodb.arangodb_pass` | ArangoDB password. **Required** — Helm will fail if this is missing. | `""` |
| `arangodb.arangodb_user` | ArangoDB user | `root` |
| `arangodb.arangodb_host` | ArangoDB host (set this to point at an external ArangoDB instance) | `localhost` |
| `arangodb.arangodb_port` | ArangoDB port | `8529` |
| `arangodb.arangodb_name` | ArangoDB database name | `vulnmgt` |
| `frontend.ingress.type` | Ingress type: `ssloff`, `alb`, `glb`, `k3s` | `glb` |
| `frontend.graphqlEndpoint` | GraphQL API endpoint the frontend talks to | `https://app.ortelius.io/api/v1/graphql` |

> NOTE: once this chart is deployed, application credentials (e.g. the ArangoDB password) can't be changed via Helm alone. To rotate them, update the corresponding secret/PV and redeploy, or use the application's built-in administrative tools if available.

Alternatively, a YAML file specifying the values above can be provided at install time:

```console
helm install my-release -f values.yaml ortelius/ortelius
```

## Accessing the Ortelius UI via Port Forwarding

* Use `kubectl port-forward` to the frontend service:

    ```console
    kubectl port-forward svc/frontend 8080:80 -n ortelius
    ```

    Then browse to `http://localhost:8080`.

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```console
helm delete my-release -n ortelius
```

This removes all the Kubernetes components associated with the chart and deletes the release. It does **not** remove the `platform-iac`-managed infrastructure (VPC, cluster, DNS, certs) — use `./terraform/deploy.sh <gke|eks> destroy` in `platform-iac` for that.

## Support

* [Issues Tracking](https://github.com/ortelius/helmcharts/issues)
* [Online User Guide](https://docs.ortelius.io)