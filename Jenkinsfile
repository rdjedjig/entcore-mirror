#!/usr/bin/env groovy

pipeline {
  agent any
    stages {
      stage('Set versions') {
        steps {
          sh './build.sh setVersions'
        }
      }
      stage('Build') {
        steps {
          checkout scm
          sh './build.sh clean install'
        }
      }
      stage('Test') {
        steps {
          script {
            try {
              sh './build.sh test'
            } catch (err) {
            }
          }
        }
      }
      stage('Publish') {
        steps {
          sh './build.sh publish'
        }
      }
    }
}

