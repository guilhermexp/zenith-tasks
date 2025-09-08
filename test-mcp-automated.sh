#!/bin/bash

echo "🧪 TESTE AUTOMATIZADO - INTEGRAÇÃO MCP ZENITH TASKS"
echo "================================================"

BASE_URL="http://localhost:3457/api/mcp"

# Função para exibir resultado
show_result() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
    else
        echo "❌ $2"
    fi
}

echo -e "\n1️⃣ Testando adição de servidor..."
RESPONSE=$(curl -s -X POST $BASE_URL/servers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-auto",
    "name": "Automated Test Server",
    "baseUrl": "http://localhost:8765",
    "toolsPath": "/tools"
  }')
[ ! -z "$RESPONSE" ] && show_result 0 "Servidor adicionado" || show_result 1 "Falha ao adicionar servidor"

echo -e "\n2️⃣ Testando listagem de servidores..."
SERVERS=$(curl -s $BASE_URL/servers)
echo "$SERVERS" | grep -q "test-auto"
show_result $? "Servidor encontrado na lista"

echo -e "\n3️⃣ Testando listagem de tools..."
TOOLS=$(curl -s $BASE_URL/servers/test-auto/tools)
echo "$TOOLS" | grep -q "calculator"
show_result $? "Tool 'calculator' encontrada"
echo "$TOOLS" | grep -q "test-tool"
show_result $? "Tool 'test-tool' encontrada"

echo -e "\n4️⃣ Testando execução de tools..."
CALC_RESULT=$(curl -s -X POST $BASE_URL/servers/test-auto/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "calculator",
    "arguments": {"operation": "multiply", "a": 9, "b": 9}
  }' | jq -r '.result')
[ "$CALC_RESULT" = "81" ] && show_result 0 "Calculadora: 9 x 9 = 81" || show_result 1 "Erro na calculadora"

ECHO_RESULT=$(curl -s -X POST $BASE_URL/servers/test-auto/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-tool",
    "arguments": {"message": "Automated test"}
  }' | jq -r '.result')
echo "$ECHO_RESULT" | grep -q "Automated test"
show_result $? "Echo tool funcionando"

echo -e "\n5️⃣ Testando remoção de servidor..."
curl -s -X DELETE $BASE_URL/servers/test-auto
SERVERS_AFTER=$(curl -s $BASE_URL/servers)
echo "$SERVERS_AFTER" | grep -q "test-auto"
[ $? -ne 0 ] && show_result 0 "Servidor removido" || show_result 1 "Falha ao remover servidor"

echo -e "\n✨ TESTE COMPLETO!"
