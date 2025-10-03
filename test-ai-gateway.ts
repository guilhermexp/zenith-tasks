#!/usr/bin/env tsx

/**
 * Script de teste do AI Gateway
 * Execute com: npx tsx test-ai-gateway.ts
 */

import { getGatewayProvider, isGatewayAvailable } from './src/server/ai/gateway/provider';
import { getModelSelector } from './src/server/ai/gateway/model-selector';
import { getCreditMonitor } from './src/server/ai/gateway/credit-monitor';
import { AIProvider } from './src/server/aiProvider';

// Configurar variáveis de ambiente para teste
process.env.AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'test-key';
process.env.USE_AI_GATEWAY = 'true';

async function testGatewayProvider() {
  console.log('\n🧪 Testando GatewayProvider...\n');

  try {
    // Verificar disponibilidade
    const available = await isGatewayAvailable();
    console.log(`✅ Gateway disponível: ${available}`);

    if (!available) {
      console.log('⚠️  Gateway não está disponível. Verifique a configuração.');
      return false;
    }

    const provider = getGatewayProvider();

    // Testar descoberta de modelos
    console.log('\n📋 Descobrindo modelos...');
    const models = await provider.getAvailableModels();
    console.log(`✅ Modelos encontrados: ${models.length}`);

    // Listar alguns modelos
    if (models.length > 0) {
      console.log('\n📊 Primeiros 5 modelos:');
      models.slice(0, 5).forEach(model => {
        console.log(`  - ${model.id}: ${model.contextWindow} tokens, $${model.pricing?.input || 0}/M input`);
      });
    }

    // Testar providers disponíveis
    const providers = await provider.getProviders();
    console.log(`\n✅ Providers disponíveis: ${providers.join(', ')}`);

    // Testar modelo recomendado
    const recommended = await provider.getRecommendedModels('chat', 3);
    console.log(`\n✅ Modelos recomendados para chat:`);
    recommended.forEach(model => {
      console.log(`  - ${model.id}`);
    });

    // Testar cache
    const cacheStats = provider.getCacheStats();
    console.log('\n📈 Estatísticas do cache:');
    console.log(`  - Modelos em cache: ${cacheStats.modelsCount}`);
    console.log(`  - Última atualização: ${cacheStats.lastModelRefresh}`);

    return true;
  } catch (error) {
    console.error('❌ Erro no GatewayProvider:', error);
    return false;
  }
}

async function testModelSelector() {
  console.log('\n🧪 Testando ModelSelector...\n');

  try {
    const selector = getModelSelector();

    // Testar seleção para diferentes contextos
    const contexts = ['chat', 'code', 'analysis', 'creative', 'fast', 'economical'];

    for (const context of contexts) {
      console.log(`\n🎯 Selecionando modelo para contexto: ${context}`);
      const model = await selector.selectModel({
        context,
        maxCost: 30,
        speedPriority: context === 'fast' ? 'fast' : 'balanced'
      });

      if (model) {
        console.log(`  ✅ Selecionado: ${model.id}`);
        console.log(`     Context: ${model.contextWindow} tokens`);
        if (model.pricing) {
          console.log(`     Custo: $${model.pricing.input}/M input, $${model.pricing.output}/M output`);
        }
      } else {
        console.log('  ⚠️  Nenhum modelo adequado encontrado');
      }
    }

    // Testar recomendações
    console.log('\n📋 Testando recomendações...');
    const recommendations = await selector.getRecommendations('chat', {
      budget: 'low',
      priority: 'speed'
    });

    console.log('✅ Top 3 recomendações (budget baixo, prioridade velocidade):');
    recommendations.slice(0, 3).forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec.model.id} - Score: ${rec.score.toFixed(2)}`);
      console.log(`     Razões: ${rec.reasons.join(', ')}`);
    });

    // Testar modelos otimizados
    console.log('\n💰 Modelos mais econômicos:');
    const costOptimized = await selector.getCostOptimizedModels(3);
    costOptimized.forEach(model => {
      if (model.pricing) {
        const avgCost = (model.pricing.input + model.pricing.output) / 2;
        console.log(`  - ${model.id}: $${avgCost.toFixed(2)}/M tokens (média)`);
      }
    });

    return true;
  } catch (error) {
    console.error('❌ Erro no ModelSelector:', error);
    return false;
  }
}

async function testCreditMonitor() {
  console.log('\n🧪 Testando CreditMonitor...\n');

  try {
    const monitor = getCreditMonitor();

    // Testar status de créditos
    console.log('💳 Obtendo status de créditos...');
    const status = await monitor.getCreditStatus();

    console.log(`\n✅ Status atual:`);
    console.log(`  - Saldo: $${status.current.balance.toFixed(2)}`);
    console.log(`  - Total usado: $${status.current.total_used.toFixed(2)}`);
    console.log(`  - Última atualização: ${status.current.last_updated}`);

    // Mostrar alertas
    if (status.alerts.length > 0) {
      console.log('\n⚠️  Alertas:');
      status.alerts.forEach(alert => {
        console.log(`  - [${alert.type}] ${alert.message}`);
      });
    } else {
      console.log('\n✅ Nenhum alerta ativo');
    }

    // Mostrar projeções
    console.log('\n📊 Projeções de uso:');
    console.log(`  - Taxa diária: $${status.projection.dailyRate.toFixed(2)}/dia`);
    console.log(`  - Taxa semanal: $${status.projection.weeklyRate.toFixed(2)}/semana`);
    console.log(`  - Taxa mensal: $${status.projection.monthlyRate.toFixed(2)}/mês`);

    if (status.projection.daysUntilEmpty !== Infinity) {
      console.log(`  - Dias até esgotar: ${status.projection.daysUntilEmpty}`);
      if (status.projection.recommendedTopUp) {
        console.log(`  - Recarga recomendada: $${status.projection.recommendedTopUp}`);
      }
    }

    // Mostrar recomendações
    if (status.recommendations.length > 0) {
      console.log('\n💡 Recomendações:');
      status.recommendations.forEach(rec => {
        console.log(`  ${rec}`);
      });
    }

    // Simular uso
    console.log('\n🔄 Simulando uso de $0.50...');
    monitor.trackUsage(0.50);

    return true;
  } catch (error) {
    console.error('❌ Erro no CreditMonitor:', error);
    return false;
  }
}

async function testAIProviderIntegration() {
  console.log('\n🧪 Testando integração com AIProvider...\n');

  try {
    const provider = AIProvider.getInstance();

    // Testar obtenção de modelo via Gateway
    console.log('🔄 Obtendo modelo via AIProvider (com Gateway)...');
    const model = await provider.getModel({
      useGateway: true,
      provider: 'gateway'
    });

    console.log('✅ Modelo obtido com sucesso');
    console.log(`  Tipo: ${typeof model}`);

    // Testar modelo para contexto específico
    console.log('\n🎯 Obtendo modelo para contexto "analysis"...');
    const contextModel = await provider.getModelForContext('analysis');
    console.log('✅ Modelo e configurações obtidos:');
    console.log(`  - Temperature: ${contextModel.settings.temperature}`);
    console.log(`  - Max Tokens: ${contextModel.settings.maxTokens}`);

    // Verificar modelos disponíveis via Gateway
    console.log('\n📋 Verificando modelos Gateway via AIProvider...');
    const gatewayModels = await provider.getAvailableGatewayModels();
    console.log(`✅ Modelos Gateway disponíveis: ${gatewayModels.length}`);

    // Verificar créditos via AIProvider
    console.log('\n💳 Verificando créditos via AIProvider...');
    const credits = await provider.getGatewayCredits();
    if (credits) {
      console.log(`✅ Créditos: $${credits.balance || 0}`);
    } else {
      console.log('⚠️  Não foi possível obter créditos');
    }

    return true;
  } catch (error) {
    console.error('❌ Erro na integração com AIProvider:', error);
    return false;
  }
}

async function testAPIs() {
  console.log('\n🧪 Testando APIs REST...\n');

  const baseUrl = 'http://localhost:3457';

  try {
    // Testar API de modelos
    console.log('📡 Testando GET /api/models...');
    const modelsRes = await fetch(`${baseUrl}/api/models`);
    if (modelsRes.ok) {
      const data = await modelsRes.json();
      console.log(`✅ API de modelos: ${data.total} modelos, ${data.providers?.length || 0} providers`);
    } else {
      console.log(`⚠️  API de modelos retornou: ${modelsRes.status}`);
    }

    // Testar API de créditos
    console.log('\n📡 Testando GET /api/credits...');
    const creditsRes = await fetch(`${baseUrl}/api/credits`);
    if (creditsRes.ok) {
      const data = await creditsRes.json();
      console.log(`✅ API de créditos: Saldo $${data.credits?.balance || 0}`);
    } else {
      console.log(`⚠️  API de créditos retornou: ${creditsRes.status}`);
    }

    // Testar API de modelos recomendados
    console.log('\n📡 Testando modelos recomendados...');
    const recRes = await fetch(`${baseUrl}/api/models?recommended=true&context=chat`);
    if (recRes.ok) {
      const data = await recRes.json();
      console.log(`✅ Recomendações obtidas para contexto: ${data.context}`);
    } else {
      console.log(`⚠️  API de recomendações retornou: ${recRes.status}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Erro ao testar APIs:', error);
    console.log('💡 Certifique-se de que o servidor está rodando em http://localhost:3457');
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando testes do AI Gateway Integration\n');
  console.log('=' .repeat(60));

  const results = {
    gateway: false,
    selector: false,
    monitor: false,
    integration: false,
    apis: false
  };

  // Executar testes
  results.gateway = await testGatewayProvider();
  results.selector = await testModelSelector();
  results.monitor = await testCreditMonitor();
  results.integration = await testAIProviderIntegration();

  // Testar APIs apenas se o servidor estiver rodando
  console.log('\n' + '=' .repeat(60));
  console.log('📡 Para testar as APIs, certifique-se de que o servidor está rodando.');
  console.log('   Execute: npm run dev');
  console.log('=' .repeat(60));

  // Uncomment to test APIs
  // results.apis = await testAPIs();

  // Resumo final
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('=' .repeat(60));

  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASSOU' : 'FALHOU';
    console.log(`${icon} ${test.padEnd(15)} ${status}`);
  });

  const totalPassed = Object.values(results).filter(r => r).length;
  const totalTests = Object.values(results).length;

  console.log('\n' + '=' .repeat(60));
  console.log(`🎯 Resultado: ${totalPassed}/${totalTests} testes passaram`);
  console.log('=' .repeat(60));

  // Sair com código apropriado
  process.exit(totalPassed === totalTests ? 0 : 1);
}

// Executar testes
main().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});