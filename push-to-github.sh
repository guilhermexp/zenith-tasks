#!/bin/bash

echo "🚀 Push para GitHub - Zenith Tasks"
echo "=================================="
echo ""
echo "📌 Verificando status do Git..."
git status --short

echo ""
echo "📤 Fazendo push para GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCESSO! Código enviado para GitHub!"
    echo "🔗 Acesse: https://github.com/guilhermexp/zenith-tasks"
else
    echo ""
    echo "⚠️  O repositório ainda não existe no GitHub!"
    echo ""
    echo "👉 FAÇA ISSO AGORA:"
    echo "   1. Abra: https://github.com/new"
    echo "   2. Nome: zenith-tasks"
    echo "   3. NÃO inicialize com README"
    echo "   4. Crie o repositório"
    echo "   5. Execute este script novamente!"
fi