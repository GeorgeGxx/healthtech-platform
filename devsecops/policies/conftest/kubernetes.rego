package main

# Rule 1: Deny containers without CPU/Memory limits
deny contains msg if {
    input.kind in ["Deployment", "StatefulSet", "DaemonSet", "Job"]
    container := input.spec.template.spec.containers[_]
    not container.resources.limits.cpu
    msg := sprintf("Container '%v' in %v '%v' does not have CPU limit defined", [container.name, input.kind, input.metadata.name])
}

deny contains msg if {
    input.kind in ["Deployment", "StatefulSet", "DaemonSet", "Job"]
    container := input.spec.template.spec.containers[_]
    not container.resources.limits.memory
    msg := sprintf("Container '%v' in %v '%v' does not have Memory limit defined", [container.name, input.kind, input.metadata.name])
}

# Rule 2: Deny privileged containers
deny contains msg if {
    input.kind in ["Deployment", "StatefulSet", "DaemonSet", "Job"]
    container := input.spec.template.spec.containers[_]
    container.securityContext.privileged == true
    msg := sprintf("Container '%v' in %v '%v' is running in privileged mode, which is prohibited", [container.name, input.kind, input.metadata.name])
}

# Rule 3: Deny latest image tag in production/staging
deny contains msg if {
    input.kind in ["Deployment", "StatefulSet", "DaemonSet", "Job"]
    container := input.spec.template.spec.containers[_]
    endswith(container.image, ":latest")
    msg := sprintf("Container '%v' in %v '%v' uses the ':latest' image tag. Use an immutable semantic version or digest.", [container.name, input.kind, input.metadata.name])
}

# Rule 4: Disallow containers mounting hostPath volumes
deny contains msg if {
    input.kind in ["Deployment", "StatefulSet", "DaemonSet", "Job"]
    volume := input.spec.template.spec.volumes[_]
    volume.hostPath
    msg := sprintf("%v '%v' mounts a hostPath volume '%v', which is prohibited", [input.kind, input.metadata.name, volume.name])
}

# Rule 5: Deny DEV_AUTH_BYPASS=true in Kubernetes ConfigMaps or Pods
deny contains msg if {
    input.kind == "ConfigMap"
    input.data.DEV_AUTH_BYPASS == "true"
    msg := sprintf("ConfigMap '%v' enables DEV_AUTH_BYPASS=true, which is prohibited in Kubernetes", [input.metadata.name])
}

deny contains msg if {
    input.kind in ["Deployment", "StatefulSet", "DaemonSet", "Job"]
    container := input.spec.template.spec.containers[_]
    env := container.env[_]
    env.name == "DEV_AUTH_BYPASS"
    env.value == "true"
    msg := sprintf("Container '%v' in %v '%v' sets DEV_AUTH_BYPASS=true, which is prohibited", [container.name, input.kind, input.metadata.name])
}

# Rule 6: Deny placeholder secrets in production namespace
deny contains msg if {
    input.kind == "Secret"
    input.metadata.namespace == "production"
    some key, val in input.stringData
    contains(val, "change-me")
    msg := sprintf("Secret '%v' in production contains placeholder value for '%v'. Use Azure Key Vault CSI.", [input.metadata.name, key])
}

# Rule 7: Deny wildcard CORS_ORIGINS in ConfigMaps
deny contains msg if {
    input.kind == "ConfigMap"
    input.data.CORS_ORIGINS == "*"
    msg := sprintf("ConfigMap '%v' sets wildcard CORS_ORIGINS='*', which is prohibited for PHI endpoints", [input.metadata.name])
}
