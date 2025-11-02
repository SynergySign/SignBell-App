// Jenkinsfile (Integrated CI/CD with Branch Strategy)
pipeline {
    agent any // 전역 에이전트 설정

    environment {
        AWS_REGION = 'ap-northeast-2'
        ECR_REGISTRY = '801490935747.dkr.ecr.ap-northeast-2.amazonaws.com'
        BACKEND_ECR_REPOSITORY = 'signbell-backend'
        AI_ECR_REPOSITORY = 'signbell-ai'
        KUBECONFIG_CREDENTIAL_ID = 'kubeconfig'
        AWS_CREDENTIALS_ID = 'aws-credentials'
        AI_REPO_URL = 'https://github.com/SynergySign/SignBell-FASTAPI.git'
        AI_REPO_CREDENTIAL_ID = 'github-credentials'
        DEPLOY_AI = 'true'  // AI Server 빌드 활성화
    }

    stages {
        stage('Initialize') {
            steps {
                script {
                    // 브랜치명 추출
                    env.BRANCH_NAME = env.GIT_BRANCH.replaceAll('origin/', '')
                    
                    // 이미지 태그 설정
                    env.BACKEND_IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                    env.AI_IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                    
                    echo "=== 브랜치 정보 ==="
                    echo "현재 브랜치: ${env.BRANCH_NAME}"
                    echo "Backend 이미지 태그: ${env.BACKEND_IMAGE_TAG}"
                    echo "AI 이미지 태그: ${env.AI_IMAGE_TAG}"
                    
                    // 브랜치별 환경 설정
                    if (env.BRANCH_NAME == 'main') {
                        env.DEPLOY_ENV = 'production'
                        env.S3_BUCKET_NAME = 'www.signbell.app'
                        env.CLOUDFRONT_DISTRIBUTION_ID = 'E1BB9LGYVUR99C'
                        echo "배포 환경: 프로덕션"
                    } else if (env.BRANCH_NAME == 'dev') {
                        env.DEPLOY_ENV = 'development'
                        env.S3_BUCKET_NAME = 'dev.signbell.app'
                        env.CLOUDFRONT_DISTRIBUTION_ID = 'E_DEV_DISTRIBUTION_ID'
                        echo "배포 환경: 개발"
                    } else if (env.BRANCH_NAME == 'deploy') {
                        env.DEPLOY_ENV = 'staging'
                        env.S3_BUCKET_NAME = 'www.signbell.app'
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
            steps {
                // Repo 1 (FE/BE) Checkout
                checkout scm

                // Repo 2 (AI) Checkout (별도 디렉토리에)
                dir('ai-repo') {
                    git branch: 'deploy', url: AI_REPO_URL, credentialsId: AI_REPO_CREDENTIAL_ID
                }
            }
        }

        // --- Frontend Stages ---
        stage('Frontend Pipeline') {
            stages {
                stage('Build Frontend') {
                    steps {
                        script {
                            echo "=== Frontend 빌드 시작 ==="
                        }
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
                    when {
                        expression { env.DEPLOY_ENV in ['production', 'development', 'staging'] }
                    }
                    steps {
                        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: AWS_CREDENTIALS_ID]]) {
                            sh "aws cloudfront create-invalidation --distribution-id ${env.CLOUDFRONT_DISTRIBUTION_ID} --paths '/*'"
                            echo "✅ CloudFront 캐시 무효화 완료"
                        }
                    }
                    post {
                        success {
                            echo "=== Frontend 파이프라인 완료 ==="
                        }
                    }
                }
            }
        }

        // --- Backend Stages ---
        stage('Backend Pipeline') {
            stages {
                stage('Build Backend') {
                    steps {
                        script {
                            echo "=== Backend 빌드 시작 ==="
                        }
                        dir('backend') {
                            sh './gradlew clean build -x test'
                        }
                    }
                }

                stage('Build & Push Backend Image') {
                    steps {
                        dir('backend') {
                            script {
                                buildAndPushDockerImage(BACKEND_ECR_REPOSITORY, env.BACKEND_IMAGE_TAG, '.')
                            }
                        }
                    }
                }

                stage('Deploy Backend to EKS') {
                    steps {
                        script {
                            deployToEKS('k8s/backend-deployment.yaml', "${ECR_REGISTRY}/${BACKEND_ECR_REPOSITORY}:${env.BACKEND_IMAGE_TAG}")
                            applyKubernetesManifest('k8s/backend-service.yaml')
                            applyKubernetesManifest('k8s/ingress.yaml')
                            checkRolloutStatus('deployment/signbell-backend-deployment')
                        }
                    }
                    post {
                        success {
                            echo "=== Backend 파이프라인 완료 ==="
                        }
                    }
                }
            }
        }

        // --- AI Server Stages ---
        stage('AI Server Pipeline') {
            when {
                expression { env.DEPLOY_AI == 'true' }
            }
            stages {
                stage('Build & Push AI Image') {
                    steps {
                        script {
                            echo "=== AI Server 빌드 시작 ==="
                        }
                        dir('ai-repo') {
                            script {
                                // Dockerfile 존재 확인
                                sh 'ls -la'
                                sh 'test -f Dockerfile || (echo "Dockerfile not found!" && exit 1)'
                                buildAndPushDockerImage(AI_ECR_REPOSITORY, env.AI_IMAGE_TAG, '.')
                            }
                        }
                    }
                }

                stage('Deploy AI Server to EKS') {
                    steps {
                        script {
                            deployToEKS('k8s/ai-deployment.yaml', "${ECR_REGISTRY}/${AI_ECR_REPOSITORY}:${env.AI_IMAGE_TAG}")
                            applyKubernetesManifest('k8s/ai-service.yaml')
                            
                            // AI Server는 초기화 시간이 오래 걸리므로 비동기 배포
                            echo "=== AI Server 배포 시작 (백그라운드) ==="
                            echo "AI Server Pod 상태 확인: kubectl get pods -l app=signbell-ai"
                            
                            // 간단한 상태 확인
                            withCredentials([file(credentialsId: KUBECONFIG_CREDENTIAL_ID, variable: 'KUBECONFIG_FILE')]) {
                                sh """
                                export KUBECONFIG=\$KUBECONFIG_FILE
                                export AWS_DEFAULT_REGION=ap-northeast-2
                                kubectl get pods -l app=signbell-ai -n default || echo "Pod 조회 실패 (정상 - 아직 생성 중일 수 있음)"
                                echo "AI Server 배포가 진행 중입니다. 완료까지 5-10분 소요될 수 있습니다."
                                """
                            }
                        }
                    }
                    post {
                        success {
                            echo "=== AI Server 파이프라인 완료 (배포 진행 중) ==="
                        }
                    }
                }
            }
        }
    } // End stages

    post {
        success {
            script {
                echo "=== 배포 성공 ==="
                echo "브랜치: ${env.BRANCH_NAME}"
                echo "환경: ${env.DEPLOY_ENV}"
                echo "Backend 이미지: ${ECR_REGISTRY}/${BACKEND_ECR_REPOSITORY}:${env.BACKEND_IMAGE_TAG}"
                echo "AI 이미지: ${ECR_REGISTRY}/${AI_ECR_REPOSITORY}:${env.AI_IMAGE_TAG}"
                
                if (env.BRANCH_NAME == 'deploy') {
                    echo "⚠️ deploy 브랜치 배포 완료! 테스트 후 main 브랜치로 병합하세요."
                    echo "병합 명령어:"
                    echo "  git checkout main"
                    echo "  git merge deploy"
                    echo "  git push origin main"
                } else if (env.BRANCH_NAME == 'main') {
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
        export AWS_DEFAULT_REGION=ap-northeast-2
        # macOS/Linux sed 호환
        # deploymentFile 경로가 workspace 루트 기준인지 확인 필요
        sed -i.bak 's|image:.*|image: ${imageName}|g' ${deploymentFile} && rm ${deploymentFile}.bak
        kubectl apply -f ${deploymentFile} --validate=false
        """
    }
}

def applyKubernetesManifest(manifestFile) {
     withCredentials([file(credentialsId: KUBECONFIG_CREDENTIAL_ID, variable: 'KUBECONFIG_FILE')]) {
        sh """
        export KUBECONFIG=\$KUBECONFIG_FILE
        export AWS_DEFAULT_REGION=ap-northeast-2
        kubectl apply -f ${manifestFile} --validate=false
        """
    }
}

def checkRolloutStatus(resourceName) {
     withCredentials([file(credentialsId: KUBECONFIG_CREDENTIAL_ID, variable: 'KUBECONFIG_FILE')]) {
        sh """
        export KUBECONFIG=\$KUBECONFIG_FILE
        export AWS_DEFAULT_REGION=ap-northeast-2
        kubectl rollout status ${resourceName} -n default --timeout=30m
        """
    }
}