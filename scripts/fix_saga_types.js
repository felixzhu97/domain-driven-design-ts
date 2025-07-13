const fs = require('fs');

// 读取文件
let content = fs.readFileSync('src/infrastructure/saga/SagaManager.ts', 'utf8');

// 在executeNextStep方法开始添加step检查
content = content.replace(
  'const step = steps[currentStepIndex];',
  'const step = steps[currentStepIndex];\n    if (!step) {\n      throw new Error(`步骤不存在: ${currentStepIndex}`);\n    }'
);

// 在compensateSteps方法中添加step检查
content = content.replace(
  'const step = steps[i];',
  'const step = steps[i];\n      if (!step) {\n        continue;\n      }'
);

// 修复error类型问题
content = content.replace(
  /stepHistory\.error = result\.error;/g,
  'if (result.error) stepHistory.error = result.error;'
);

// 写回文件
fs.writeFileSync('src/infrastructure/saga/SagaManager.ts', content);
console.log('修复完成');
