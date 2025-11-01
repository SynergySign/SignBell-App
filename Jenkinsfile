// Jenkinsfile (Integrated CI/CD with Branch Strategy)
pipeline {
    agent none // 전역 에이전트 없음, 각 스테이지별로 지정

    environment {
        AWS_REGION = 'ap-northeast-2'
        ECR_REGISTRY = '801490935747.dkr.ecr.ap-northeast-2.amazonaws.com'
        BACKEND_ECR_REPOSITORY = 'signbell-backend'
        AI_ECR_REPOSITORY = 'signbell-ai'
        KUBECONFIG_CREDENTIAL_ID = 'kubeconfig'
        AWS_CREDENTIALS_ID = 'aws-credentials'
        AI_REPO_URL = 'https://github.com/SynergySign/SignBell-FASTAPI.git'
        AI_REPO_CREDENTIAL_ID = 'github-credentials'
        
        // 브랜치별 환경 설정
        BRANCH_NAME = "${env.GIT_BRANCH.replaceAll('origin/', '')}"
        BACKEND_IMAGE_TAG = "${BRANCH_NAME}-${env.BUILD_NUMBER}"
        AI_IMAGE_TAG = "${BRANCH_NAME}-${env.BUILD_NUMBER}"
    }

    stages {
        stage('Branch Info') {
            agent any
            steps {
                script {
                    echo "=== 브랜치 정보 ==="
                    echo "현재 브랜치: ${BRANCH_NAME}"
                    echo "Backend 이미지 태그: ${BACKEND_IMAGE_TAG}"
                    echo "AI 이미지 태그: ${AI_IMAGE_TAG}"
                    
                    // 브랜치별 환경 설정
                    if (BRANCH_NAME == 'main') {
                        env.DEPLOY_ENV = 'production'
                        env.S3_BUCKET_NAME = 'www.signbell.app'
                        env.CLOUDFRONT_DISTRIBUTION_ID = 'E1BB9LGYVUR99C'
                        echo "배포 환경: 프로덕션"
                    } else if (BRANCH_NAME == 'dev') {
                        env.DEPLOY_ENV = 'development'
                        env.S3_BUCKET_NAME = 'dev.signbell.app' // dev 환경 S3 버킷
                        env.CLOUDFRONT_DISTRIBUTION_ID = 'E_DEV_DISTRIBUTION_ID' // dev 환경 CloudFront
                        echo "배포 환경: 개발"
                    } else if (BRANCH_NAME == 'deploy') {
                        env.DEPLOY_ENV = 'staging'
                        env.S3_BUCKET_NAME = 'www.signbell.app' // 프로덕션과 동일 (테스트용)
                        env.CLOUDFRONT_DISTRIBUTION_ID = 'E1BB9LGYVUR99C'
                        echo "배포 환경: 스테이징 (테스트)"
                    } else {
                        env.DEPLOY_ENV = 'feature'
                        echo "배포 환경: 피처 브랜치 (배포 스킵)"
                    }
                }
            }
        }

        stage('Checkout Repos') {
            agent any // Jenkins 마스터에서 실행
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
            agent any // Jenkins 마스터에서 실행
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
            agent any
            when {
                expression { env.DEPLOY_ENV in ['production', 'development', 'staging'] }
            }
            steps {
                dir('frontend/dist') {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: AWS_CREDENTIALS_ID]]) {
                        sh "aws s3 sync . s3://${env.S3_BUCKET_NAME} --delete"
                        echo "✅ Frontend 배포 완료: s3://${env.S3_BUCKET_NAME}"
                    }
                }
            }
        }

        stage('Invalidate CloudFront Cache') {
            agent any
            when {
                expression { env.DEPLOY_ENV in ['production', 'development', 'staging'] }
            }
            steps {
                 withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: AWS_CREDENTIALS_ID]]) {
                    sh "aws cloudfront create-invalidation --distribution-id ${env.CLOUDFRONT_DISTRIBUTION_ID} --paths '/*'"
                    echo "✅ CloudFront 캐시 무효화 완료"
                }
            }
        }

        // --- Backend Stages ---
        stage('Build Backend') {
            agent any // Jenkins 마스터에서 실행
            // when { changeSet "backend/**" }
            steps {
                dir('backend') {
                    sh './gradlew clean build -x test'
                }
            }
        }

        stage('Build & Push Backend Image') {
            agent any // Jenkins 마스터에서 실행
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
            agent any // Jenkins 마스터에서 실행
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
            agent any // Jenkins 마스터에서 실행
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
            agent any // Jenkins 마스터에서 실행
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
        success {
            script {
                echo "=== 배포 성공 ==="
                echo "브랜치: ${BRANCH_NAME}"
                echo "환경: ${env.DEPLOY_ENV}"
                echo "Backend 이미지: ${ECR_REGISTRY}/${BACKEND_ECR_REPOSITORY}:${BACKEND_IMAGE_TAG}"
                echo "AI 이미지: ${ECR_REGISTRY}/${AI_ECR_REPOSITORY}:${AI_IMAGE_TAG}"
                
                if (BRANCH_NAME == 'deploy') {
                    echo "⚠️ deploy 브랜치 배포 완료! 테스트 후 main 브랜치로 병합하세요."
                    echo "병합 명령어:"
                    echo "  git checkout main"
                    echo "  git merge deploy"
                    echo "  git push origin main"
                } else if (BRANCH_NAME == 'main') {
                    echo "🎉 프로덕션 배포 완료!"
                }
            }
        }
        failure {
            echo "❌ 배포 실패! 로그를 확인하세요."
        }
        always {
            deleteDir()
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