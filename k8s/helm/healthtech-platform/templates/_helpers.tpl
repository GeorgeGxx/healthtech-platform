{{- define "healthtech.labels" -}}
app.kubernetes.io/part-of: healthtech-platform
app.kubernetes.io/managed-by: {{ .Release.Service }}
environment: {{ .Values.global.environment }}
{{- end -}}
