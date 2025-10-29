// Jenkinsfile (Integrated CI/CD in Repo 1)
pipeline {
    agent none // 전역 에이전트 없음, 각 스테이지별로 지정

    environment {
        AWS_REGION = 'ap-northeast-2'
        ECR_REGISTRY = '801490935747.dkr.ecr.ap-northeast-2.amazonaws.com' // 본인 ECR 주소
        BACKEND_ECR_REPOSITORY = 'signbell-backend'
        AI_ECR_REPOSITORY = 'signbell-ai' // AI 서버 ECR Repo 이름
        BACKEND_IMAGE_TAG = "be-${env.BUILD_NUMBER}"
        AI_IMAGE_TAG = "ai-${env.BUILD_NUMBER}"
        KUBECONFIG_CREDENTIAL_ID = 'kubeconfig'
        AWS_CREDENTIALS_ID = 'aws-credentials' // Jenkins Credential ID
        S3_BUCKET_NAME = 'www.signbell.app' // Frontend S3 버킷 이름
        CLOUDFRONT_DISTRIBUTION_ID = 'E1BB9LGYVUR99C' // CloudFront 배포 ID
        // AI 서버 레포지토리 정보 (Repo 2)
        AI_REPO_URL = 'https://github.com/SynergySign/SignBell-FASTAPI.git' // 실제 AI 레포 주소
        AI_REPO_CREDENTIAL_ID = 'github-credentials' // 동일 Credential 사용 시
    }

    stages {
        stage('Checkout Repos') {
            agent { label 'fe-agent' } // 가벼운 에이전트로 Checkout
            steps {
                // Repo 1 (FE/BE) Checkout
                checkout scm

                // Repo 2 (AI) Checkout (별도 디렉토리에)
                dir('ai-repo') {
                    git branch: 'main', url: AI_REPO_URL, credentialsId: AI_REPO_CREDENTIAL_ID
                }
            }
        }

        // --- Frontend Stages ---
        stage('Build Frontend') {
            agent { label 'fe-agent' } // Node.js 에이전트 사용
            // frontend 디렉토리 변경 시에만 실행 (선택적 최적화)
            // when { changeSet "frontend/**" }
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh """
                    echo "VITE_API_BASE_URL=https://api.signbell.app" > .env.production
                    echo "VITE_AI_WEBSOCKET_URL=wss://ai.signbell.app/ws" >> .env.production
                    npm run build
                    """
                }
            }
        }

        stage('Deploy Frontend to S3') {
            agent { label 'fe-agent' } // AWS CLI 포함 에이전트
            // when { changeSet "frontend/**" }
            steps {
                dir('frontend/dist') {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: AWS_CREDENTIALS_ID]]) {
                        sh "aws s3 sync . s3://${S3_BUCKET_NAME} --delete"
                    }
                }
            }
        }

        stage('Invalidate CloudFront Cache') {
            agent { label 'fe-agent' } // AWS CLI 포함 에이전트
            // when { changeSet "frontend/**" }
            steps {
                 withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: AWS_CREDENTIALS_ID]]) {
                    sh "aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths '/*'"
                }
            }
        }

        // --- Backend Stages ---
        stage('Build Backend') {
            agent { label 'be-agent' } // Gradle + JDK17 에이전트
            // when { changeSet "backend/**" }
            steps {
                dir('backend') {
                    sh './gradlew clean build -x test'
                }
            }
        }

        stage('Build & Push Backend Image') {
            agent { label 'be-agent' } // Docker CLI 포함 에이전트
            // when { changeSet "backend/**" }
            steps {
                dir('backend') {
                    script {
                        buildAndPushDockerImage(BACKEND_ECR_REPOSITORY, BACKEND_IMAGE_TAG, '.')
                    }
                }
            }
        }

        stage('Deploy Backend to EKS') {
            agent { label 'be-agent' } // kubectl 포함 에이전트
            // when { changeSet "backend/**" }
            steps {
                script {
                    deployToEKS('k8s/backend-deployment.yaml', "${ECR_REGISTRY}/${BACKEND_ECR_REPOSITORY}:${BACKEND_IMAGE_TAG}")
                    applyKubernetesManifest('k8s/backend-service.yaml')
                    applyKubernetesManifest('k8s/ingress.yaml') // Ingress는 한 번만 적용해도 됨
                    checkRolloutStatus('deployment/signbell-backend-deployment')
                }
            }
        }

        // --- AI Server Stages ---
        stage('Build & Push AI Image') {
            agent { label 'ai-agent' } // Python + Docker CLI 에이전트
            // AI Repo 변경 시에만 실행 (선택적 최적화)
            // when { changeSet "ai-repo/**" }
            steps {
                dir('ai-repo') { // AI 서버 코드 경로 확인 필요
                    script {
                        buildAndPushDockerImage(AI_ECR_REPOSITORY, AI_IMAGE_TAG, '.') // Dockerfile 위치 기준
                    }
                }
            }
        }

        stage('Deploy AI Server to EKS') {
            agent { label 'ai-agent' } // kubectl 포함 에이전트
            // when { changeSet "ai-repo/**" }
            steps {
                script {
                    deployToEKS('k8s/ai-deployment.yaml', "${ECR_REGISTRY}/${AI_ECR_REPOSITORY}:${AI_IMAGE_TAG}")
                    applyKubernetesManifest('k8s/ai-service.yaml')
                    // Ingress는 이미 적용됨
                    checkRolloutStatus('deployment/signbell-ai-deployment')
                }
            }
        }
    } // End stages

    post {
        always {
            // AI 레포 디렉토리 삭제 등 정리 작업 추가 가능
            deleteDir() // 기본 작업 공간 정리
        }
    }
} // End pipeline

// --- Helper Functions (buildAndPushDockerImage, deployToEKS, applyKubernetesManifest, checkRolloutStatus) ---
// (Jenkinsfile 안에 포함)
def buildAndPushDockerImage(repoName, tag, dockerfilePath) {
    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: AWS_CREDENTIALS_ID]]) {
        sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"
        // dockerfilePath가 '.' 이면 현재 dir 기준, 아니면 전체 경로 명시 필요
        def imageFullName = "${ECR_REGISTRY}/${repoName}:${tag}"
        sh "docker build -t ${imageFullName} ${dockerfilePath}"
        sh "docker push ${imageFullName}"
    }
}

def deployToEKS(deploymentFile, imageName) {
    withCredentials([file(credentialsId: KUBECONFIG_CREDENTIAL_ID, variable: 'KUBECONFIG_FILE')]) {
        sh """
        export KUBECONFIG=\$KUBECONFIG_FILE
        # macOS/Linux sed 호환
        # deploymentFile 경로가 workspace 루트 기준인지 확인 필요
        sed -i.bak 's|image:.*|image: ${imageName}|g' ${deploymentFile} && rm ${deploymentFile}.bak
        kubectl apply -f ${deploymentFile}
        """
    }
}

def applyKubernetesManifest(manifestFile) {
     withCredentials([file(credentialsId: KUBECONFIG_CREDENTIAL_ID, variable: 'KUBECONFIG_FILE')]) {
        sh """
        export KUBECONFIG=\$KUBECONFIG_FILE
        kubectl apply -f ${manifestFile}
        """
    }
}

def checkRolloutStatus(resourceName) {
     withCredentials([file(credentialsId: KUBECONFIG_CREDENTIAL_ID, variable: 'KUBECONFIG_FILE')]) {
        sh """
        export KUBECONFIG=\$KUBECONFIG_FILE
        kubectl rollout status ${resourceName} -n default --timeout=5m
        """
    }
}