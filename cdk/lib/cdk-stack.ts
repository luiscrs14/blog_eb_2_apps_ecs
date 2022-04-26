import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ApplicationTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, "vpc", {
      isDefault: true
    });

    const cluster = new ecs.Cluster(this, 'cluster', { vpc });
    cluster.addCapacity('clusterCapacity', {
      instanceType: new ec2.InstanceType('t3.micro'),
    });

    //App A
    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'appATaskDef');
    taskDefinition.addContainer('appAContainer', {
      containerName: 'app_a',
      image: ecs.ContainerImage.fromAsset("$PATH_TO_APP_A"),
      portMappings: [{ containerPort: 3000 }],
      memoryReservationMiB: 256,
    });

    const appAService = new ecs.Ec2Service(this, 'appAService', {
      cluster,
      taskDefinition,
    });

    // App B
    const appBTaskDefinition = new ecs.Ec2TaskDefinition(this, 'appBTaskDef');
    appBTaskDefinition.addContainer('appBContainer', {
      containerName: 'app_b',
      image: ecs.ContainerImage.fromAsset("$PATH_TO_APP_B"),
      portMappings: [{ containerPort: 3001 }],
      memoryReservationMiB: 256,
    });

    const appBService = new ecs.Ec2Service(this, 'appBService', {
      cluster,
      taskDefinition: appBTaskDefinition,
    });

    // Target Groups
    const appAtargetGroup = new ApplicationTargetGroup(this, 'appATargetGroup', {
      vpc,
      port: 80,
      targets: [appAService.loadBalancerTarget({
        containerName: 'app_a',
      })],
    });

    const appBTargetGroup = new ApplicationTargetGroup(this, 'appBTargetGroup', {
      vpc,
      port: 80,
      targets: [appBService.loadBalancerTarget({
        containerName: 'app_b',
      })],
    });

    // Load balancer and listener setup
    const lb = new elbv2.ApplicationLoadBalancer(this, 'lb', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'Ecs2AppTest'
    });

    const listener = lb.addListener('listener', {
      port: 80,
      defaultTargetGroups: [
        appAtargetGroup,
      ],
    });

    listener.addTargetGroups('targetGroupAdd', {
      targetGroups: [appBTargetGroup],
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/app_b']),
      ],
      priority: 10
    });
  }
}
