#!/bin/bash

# Zenith Tasks Test Suite
# Comprehensive testing script for all functionality

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3457"
PASSED_TESTS=0
FAILED_TESTS=0

echo "======================================="
echo "       ZENITH TASKS TEST SUITE        "
echo "======================================="
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗${NC} $2"
        ((FAILED_TESTS++))
    fi
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint" 2>/dev/null || echo "000")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        print_result 0 "$description (HTTP $http_code)"
        echo "  Response: $(echo $body | python3 -c "import sys, json; print(json.dumps(json.loads(sys.stdin.read()), indent=2)[:100] + '...' if len(sys.stdin.read()) > 100 else json.dumps(json.loads(sys.stdin.read()), indent=2))" 2>/dev/null || echo "$body" | head -c 100)"
        return 0
    else
        print_result 1 "$description (HTTP $http_code)"
        echo "  Error: $body"
        return 1
    fi
}

echo "1. API ENDPOINTS TESTS"
echo "----------------------"

# Test Assistant API
test_endpoint "POST" "/api/assistant" \
    '{"message":"Como está meu dia hoje?"}' \
    "Assistant: Check agenda"

test_endpoint "POST" "/api/assistant" \
    '{"message":"Crie uma tarefa para estudar TypeScript amanhã"}' \
    "Assistant: Create task"

# Test Inbox Analyze API
test_endpoint "POST" "/api/inbox/analyze" \
    '{"text":"Comprar leite e pão hoje"}' \
    "Inbox: Single task parsing"

test_endpoint "POST" "/api/inbox/analyze" \
    '{"text":"Reunião com time às 14h, enviar relatório até sexta, pagar conta de luz"}' \
    "Inbox: Multiple items parsing"

# Test MCP APIs
test_endpoint "POST" "/api/mcp/servers" \
    '{"name":"Test Server","baseUrl":"https://httpbin.org","callPath":"/post"}' \
    "MCP: Register server"

test_endpoint "GET" "/api/mcp/servers" "" \
    "MCP: List servers"

echo ""
echo "2. TYPESCRIPT & BUILD TESTS"
echo "---------------------------"

# TypeScript check
echo -n "Running TypeScript check... "
if npm run typecheck > /dev/null 2>&1; then
    print_result 0 "TypeScript compilation"
else
    print_result 1 "TypeScript compilation"
fi

# Build test
echo -n "Testing production build... "
if npm run build > /dev/null 2>&1; then
    print_result 0 "Next.js build"
else
    print_result 1 "Next.js build"
fi

echo ""
echo "3. PERFORMANCE TESTS"
echo "--------------------"

# Response time test
start_time=$(date +%s%N)
curl -s -X POST "$API_URL/api/assistant" \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}' > /dev/null 2>&1
end_time=$(date +%s%N)
response_time=$((($end_time - $start_time) / 1000000))

if [ $response_time -lt 2000 ]; then
    print_result 0 "Assistant response time: ${response_time}ms"
else
    print_result 1 "Assistant response time: ${response_time}ms (>2000ms)"
fi

# Rate limiting test
echo -n "Testing rate limiting... "
for i in {1..35}; do
    curl -s -X POST "$API_URL/api/assistant" \
        -H "Content-Type: application/json" \
        -d '{"message":"test"}' > /dev/null 2>&1 &
done
wait

last_response=$(curl -s -w "%{http_code}" -X POST "$API_URL/api/assistant" \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}' -o /dev/null 2>/dev/null)

if [ "$last_response" = "429" ]; then
    print_result 0 "Rate limiting (429 on excess requests)"
else
    print_result 1 "Rate limiting (expected 429, got $last_response)"
fi

echo ""
echo "4. AI INTEGRATION TESTS"
echo "-----------------------"

# Test with actual AI call
response=$(curl -s -X POST "$API_URL/api/inbox/analyze" \
    -H "Content-Type: application/json" \
    -d '{"text":"Criar apresentação sobre IA generativa para quinta-feira às 15:00"}' 2>/dev/null)

if echo "$response" | grep -q '"type"'; then
    print_result 0 "AI text analysis with Gemini/OpenRouter"
else
    print_result 1 "AI text analysis failed"
fi

echo ""
echo "5. ERROR HANDLING TESTS"
echo "-----------------------"

# Invalid JSON test
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/assistant" \
    -H "Content-Type: application/json" \
    -d 'invalid json' 2>/dev/null | tail -n1)

if [ "$response" = "400" ] || [ "$response" = "500" ]; then
    print_result 0 "Invalid JSON handling"
else
    print_result 1 "Invalid JSON handling (expected 400/500, got $response)"
fi

# Missing parameters test
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/inbox/analyze" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null | tail -n1)

if [ "$response" = "400" ] || [ "$response" = "500" ]; then
    print_result 0 "Missing parameters handling"
else
    print_result 1 "Missing parameters handling"
fi

echo ""
echo "======================================="
echo "            TEST SUMMARY               "
echo "======================================="
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"
echo -e "Total:  $(($PASSED_TESTS + $FAILED_TESTS))"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC} ✨"
    exit 0
else
    echo -e "\n${YELLOW}Some tests failed. Please review the output above.${NC}"
    exit 1
fi