const fs = require('fs');

// 读取文件
let content = fs.readFileSync('src/infrastructure/saga/SagaManager.ts', 'utf8');

// 找到SagaInstance创建的地方并修复
const oldSagaInstance = `    // 创建Saga实例
    const sagaInstance: SagaInstance = {
      sagaId: context.sagaId,
      sagaType: saga.sagaType,
      correlationId,
      status: SagaStatus.PENDING,
      context,
      steps,
      stepHistory: [],
      currentStepIndex: 0,
      completedSteps: 0,
      failedSteps: 0,
      compensatedSteps: 0,
      totalSteps: steps.length,
      startedAt: new Date(),
      createdBy: userId,
      version: 1,
    };`;

const newSagaInstance = `    // 创建Saga实例
    const sagaInstance: SagaInstance = {
      sagaId: context.sagaId,
      sagaType: saga.sagaType,
      correlationId,
      status: SagaStatus.PENDING,
      context,
      steps,
      stepHistory: [],
      currentStepIndex: 0,
      completedSteps: 0,
      failedSteps: 0,
      compensatedSteps: 0,
      totalSteps: steps.length,
      startedAt: new Date(),
      version: 1,
    };
    
    if (userId !== undefined) {
      sagaInstance.createdBy = userId;
    }`;

content = content.replace(oldSagaInstance, newSagaInstance);

// 写回文件
fs.writeFileSync('src/infrastructure/saga/SagaManager.ts', content);
console.log('修复SagaInstance类型完成');
