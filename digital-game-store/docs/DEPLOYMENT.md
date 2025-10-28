# Deployment Guide

This guide covers deploying the Digital Game Store platform to production.

## Prerequisites

- AWS Account
- Docker
- Terraform >= 1.0
- AWS CLI configured
- Domain name and SSL certificate

## Infrastructure Setup

### 1. Configure Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
aws_region        = "us-east-1"
environment       = "production"
db_instance_class = "db.t3.large"
db_username       = "medusa_admin"
db_password       = "your-secure-password"
redis_node_type   = "cache.t3.medium"
desired_count     = 3
```

### 2. Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

This creates:
- VPC with public/private subnets
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis
- ECS Cluster
- Application Load Balancer
- CloudWatch Log Groups
- Security Groups

### 3. Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_REGISTRY

# Build image
docker build -t digital-game-store:latest .

# Tag and push
docker tag digital-game-store:latest YOUR_ECR_REGISTRY/digital-game-store:latest
docker push YOUR_ECR_REGISTRY/digital-game-store:latest
```

### 4. Create ECS Task Definition

Create `ecs-task-definition.json`:

```json
{
  "family": "digital-game-store-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "YOUR_ECR_REGISTRY/digital-game-store:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 9000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:DATABASE_URL"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:REDIS_URL"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/digital-game-store",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}
```

Register task definition:

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

### 5. Create ECS Service

```bash
aws ecs create-service \
  --cluster digital-game-store-cluster \
  --service-name digital-game-store-api \
  --task-definition digital-game-store-api \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=api,containerPort=9000"
```

### 6. Run Database Migrations

```bash
aws ecs run-task \
  --cluster digital-game-store-cluster \
  --task-definition digital-game-store-migration \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}" \
  --overrides '{"containerOverrides":[{"name":"migration","command":["npm","run","db:migrate"]}]}'
```

### 7. Configure DNS

Point your domain to the Load Balancer DNS:

```bash
# Get ALB DNS
aws elbv2 describe-load-balancers --names digital-game-store-alb --query 'LoadBalancers[0].DNSName'

# Create CNAME record
api.digitalgamestore.com -> ALB_DNS_NAME
```

## Worker Deployment

Deploy BullMQ workers as separate ECS tasks:

```bash
aws ecs create-service \
  --cluster digital-game-store-cluster \
  --service-name digital-game-store-workers \
  --task-definition digital-game-store-workers \
  --desired-count 10 \
  --launch-type FARGATE
```

## Monitoring Setup

### CloudWatch Alarms

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Order fulfillment failures
aws cloudwatch put-metric-alarm \
  --alarm-name high-fulfillment-failure-rate \
  --alarm-description "Alert when fulfillment failure rate exceeds 5%" \
  --metric-name FulfillmentFailureRate \
  --namespace DigitalGameStore \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### Log Insights Queries

```sql
-- Failed orders
fields @timestamp, orderId, error
| filter @message like /fulfillment failed/
| sort @timestamp desc
| limit 100

-- Average fulfillment time
fields @timestamp, duration
| filter @message like /order.fulfilled/
| stats avg(duration) as avg_duration by bin(5m)
```

## Scaling Configuration

### Auto Scaling for ECS

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/digital-game-store-cluster/digital-game-store-api \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 3 \
  --max-capacity 20

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/digital-game-store-cluster/digital-game-store-api \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

## Backup Strategy

### RDS Automated Backups

Configured in Terraform:
- Daily backups at 3:00 AM UTC
- 7-day retention period
- Point-in-time recovery enabled

### Redis Backups

```bash
# Create snapshot
aws elasticache create-snapshot \
  --snapshot-name digital-game-store-redis-$(date +%Y%m%d) \
  --cache-cluster-id digital-game-store-redis
```

## Rollback Procedure

If deployment fails:

```bash
# Revert to previous task definition
aws ecs update-service \
  --cluster digital-game-store-cluster \
  --service digital-game-store-api \
  --task-definition digital-game-store-api:PREVIOUS_REVISION

# Or rollback via deployment
aws ecs create-deployment \
  --cluster digital-game-store-cluster \
  --service digital-game-store-api \
  --task-definition digital-game-store-api:STABLE_REVISION
```

## Security Checklist

- [ ] All secrets stored in AWS Secrets Manager
- [ ] Security groups follow least privilege
- [ ] SSL/TLS certificates configured
- [ ] Database encryption at rest enabled
- [ ] WAF rules configured for ALB
- [ ] VPC flow logs enabled
- [ ] CloudTrail logging enabled
- [ ] IAM roles follow least privilege
- [ ] Rotate secrets regularly
- [ ] Enable MFA for AWS accounts

## Cost Optimization

### Estimated Monthly Costs (100K orders/month)

- **RDS PostgreSQL (db.t3.large)**: $150
- **ElastiCache Redis (cache.t3.medium)**: $80
- **ECS Fargate (3 tasks × 1vCPU, 2GB)**: $180
- **BullMQ Workers (10 tasks × 0.5vCPU, 1GB)**: $120
- **Application Load Balancer**: $25
- **Data Transfer**: $100
- **CloudWatch Logs**: $50
- **Total**: ~$705/month

### Optimization Tips

1. Use Reserved Instances for RDS (save 40%)
2. Enable ECS task auto-scaling
3. Implement Redis cache effectively
4. Use S3 Intelligent-Tiering for backups
5. Clean up old logs and CloudWatch metrics

## Troubleshooting

### Service not starting

```bash
# Check task logs
aws logs tail /ecs/digital-game-store --follow

# Describe service events
aws ecs describe-services \
  --cluster digital-game-store-cluster \
  --services digital-game-store-api
```

### High error rates

```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=digital-game-store-api \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average
```

## Support

For deployment issues, check:
1. CloudWatch Logs
2. ECS Service Events
3. CloudWatch Alarms
4. Application health checks

