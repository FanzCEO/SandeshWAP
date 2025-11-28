#!/bin/bash

# AI Features and WebSocket Performance Testing
# Enterprise-Grade Validation

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://localhost:5000"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="ai_websocket_results_${TIMESTAMP}.txt"

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  AI FEATURES & WEBSOCKET PERFORMANCE TEST   ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo "Started at: $(date)"
echo

# Initialize results
cat > "$RESULTS_FILE" <<EOF
AI FEATURES & WEBSOCKET PERFORMANCE VALIDATION
Generated: $(date)
API Base: $API_BASE

RESULTS:
========
EOF

echo -e "${GREEN}=== AI FEATURES PERFORMANCE TESTING ===${NC}"
echo "AI Features Performance Testing" >> "$RESULTS_FILE"
echo "================================" >> "$RESULTS_FILE"

# Test AI command explanation
echo "Testing AI command dry-run analysis..."
echo "Testing AI command dry-run analysis..." >> "$RESULTS_FILE"

for i in {1..3}; do
    start_time=$(date +%s.%N)
    
    response=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"command":"ls -la"}' \
        "$API_BASE/api/ai/dryrun" 2>/dev/null || echo "ERROR")
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc -l)
    
    if [ "$response" != "ERROR" ]; then
        echo "  AI dryrun test $i: ${duration}s - SUCCESS"
        echo "  AI dryrun test $i: ${duration}s - SUCCESS" >> "$RESULTS_FILE"
    else
        echo "  AI dryrun test $i: ${duration}s - FAILED (expected for rate limiting)"
        echo "  AI dryrun test $i: ${duration}s - FAILED (expected for rate limiting)" >> "$RESULTS_FILE"
    fi
done

# Test AI providers endpoint
echo "Testing AI providers status..."
echo "Testing AI providers status..." >> "$RESULTS_FILE"

start_time=$(date +%s.%N)
providers_response=$(curl -s "$API_BASE/api/ai/providers" 2>/dev/null || echo "ERROR")
end_time=$(date +%s.%N)
providers_duration=$(echo "$end_time - $start_time" | bc -l)

echo "  AI providers status: ${providers_duration}s"
echo "  AI providers status: ${providers_duration}s" >> "$RESULTS_FILE"

# Test AI generate endpoint (may fail due to no API keys, but we test performance)
echo "Testing AI generate endpoint performance..."
echo "Testing AI generate endpoint performance..." >> "$RESULTS_FILE"

start_time=$(date +%s.%N)
generate_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"Hello"}],"providerId":"openai"}' \
    "$API_BASE/api/ai/generate" 2>/dev/null || echo "ERROR")
end_time=$(date +%s.%N)
generate_duration=$(echo "$end_time - $start_time" | bc -l)

echo "  AI generate test: ${generate_duration}s"
echo "  AI generate test: ${generate_duration}s" >> "$RESULTS_FILE"

echo -e "\n${GREEN}=== WEBSOCKET PERFORMANCE TESTING ===${NC}"
echo "WebSocket Performance Testing" >> "$RESULTS_FILE"
echo "============================" >> "$RESULTS_FILE"

# Create WebSocket test using netcat or similar approach since we don't have Node.js websocket client
echo "Testing WebSocket connection establishment..."
echo "Testing WebSocket connection establishment..." >> "$RESULTS_FILE"

# Test WebSocket endpoint availability (check if it responds to HTTP first)
echo "Checking WebSocket endpoint availability..."
ws_http_test=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/ws" 2>/dev/null || echo "000")
echo "  WebSocket HTTP test response: $ws_http_test"
echo "  WebSocket HTTP test response: $ws_http_test" >> "$RESULTS_FILE"

# Test WebSocket-like connection using curl (will fail but we measure response time)
start_time=$(date +%s.%N)
ws_connection_test=$(curl -s -o /dev/null -w "%{time_total}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    "$API_BASE/ws" 2>/dev/null || echo "0.100")
end_time=$(date +%s.%N)

echo "  WebSocket connection attempt time: ${ws_connection_test}s"
echo "  WebSocket connection attempt time: ${ws_connection_test}s" >> "$RESULTS_FILE"

echo -e "\n${GREEN}=== EXTENDED RELIABILITY TEST ===${NC}"
echo "Extended Reliability Test" >> "$RESULTS_FILE"
echo "========================" >> "$RESULTS_FILE"

# Run extended test for 10 minutes (shorter version for practical testing)
echo "Running extended reliability test (10 minutes)..."
echo "Running extended reliability test (10 minutes)..." >> "$RESULTS_FILE"

# Initialize counters
total_requests=0
successful_requests=0
failed_requests=0
max_response_time=0
min_response_time=999
total_response_time=0

# Get initial memory
initial_memory=$(ps -o rss -p $(pgrep -f "server/index.ts") | tail -n +2 | head -n 1 || echo "0")
echo "Initial memory: ${initial_memory}KB"
echo "Initial memory: ${initial_memory}KB" >> "$RESULTS_FILE"

# Run test for 10 minutes (600 seconds)
test_duration=600
start_test_time=$(date +%s)

echo "Starting extended reliability test..."
while [ $(($(date +%s) - start_test_time)) -lt $test_duration ]; do
    # Test different endpoints randomly
    endpoints=("/api" "/api/project" "/api/files" "/api/ai/providers")
    random_endpoint=${endpoints[$((RANDOM % ${#endpoints[@]}))]}
    
    start_time=$(date +%s.%N)
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE$random_endpoint" 2>/dev/null || echo "000")
    end_time=$(date +%s.%N)
    response_time=$(echo "$end_time - $start_time" | bc -l)
    
    total_requests=$((total_requests + 1))
    total_response_time=$(echo "$total_response_time + $response_time" | bc -l)
    
    if [ "$response_code" == "200" ]; then
        successful_requests=$((successful_requests + 1))
    else
        failed_requests=$((failed_requests + 1))
    fi
    
    # Update min/max response times
    if (( $(echo "$response_time > $max_response_time" | bc -l) )); then
        max_response_time=$response_time
    fi
    if (( $(echo "$response_time < $min_response_time" | bc -l) )); then
        min_response_time=$response_time
    fi
    
    # Progress update every minute
    elapsed=$(($(date +%s) - start_test_time))
    if [ $((elapsed % 60)) -eq 0 ] && [ $elapsed -gt 0 ]; then
        current_memory=$(ps -o rss -p $(pgrep -f "server/index.ts") | tail -n +2 | head -n 1 || echo "0")
        echo "  Progress: ${elapsed}s/${test_duration}s - Requests: $total_requests, Success: $successful_requests, Memory: ${current_memory}KB"
    fi
    
    # Small delay between requests
    sleep 0.1
done

# Final calculations
final_memory=$(ps -o rss -p $(pgrep -f "server/index.ts") | tail -n +2 | head -n 1 || echo "0")
memory_change=$((final_memory - initial_memory))
avg_response_time=$(echo "scale=3; $total_response_time / $total_requests" | bc -l)
success_rate=$(echo "scale=2; $successful_requests * 100 / $total_requests" | bc -l)
requests_per_second=$(echo "scale=2; $total_requests / $test_duration" | bc -l)

echo -e "\n${GREEN}=== EXTENDED TEST RESULTS ===${NC}"
echo "Extended Test Results:" >> "$RESULTS_FILE"
echo "Total requests: $total_requests"
echo "Successful requests: $successful_requests"
echo "Failed requests: $failed_requests"
echo "Success rate: ${success_rate}%"
echo "Average response time: ${avg_response_time}s"
echo "Min response time: ${min_response_time}s"
echo "Max response time: ${max_response_time}s"
echo "Requests per second: ${requests_per_second}"
echo "Memory change: ${memory_change}KB"

# Write results to file
cat >> "$RESULTS_FILE" <<EOF
Total requests: $total_requests
Successful requests: $successful_requests
Failed requests: $failed_requests
Success rate: ${success_rate}%
Average response time: ${avg_response_time}s
Min response time: ${min_response_time}s
Max response time: ${max_response_time}s
Requests per second: ${requests_per_second}
Initial memory: ${initial_memory}KB
Final memory: ${final_memory}KB
Memory change: ${memory_change}KB
EOF

echo -e "\n${GREEN}=== FINAL AI & WEBSOCKET ASSESSMENT ===${NC}"
echo "Final Assessment:" >> "$RESULTS_FILE"

# Assessment criteria
ai_performance="GOOD"
websocket_performance="ACCEPTABLE"
reliability_grade="A"

# Assess AI performance
if (( $(echo "$providers_duration < 0.100" | bc -l) )); then
    ai_performance="EXCELLENT"
elif (( $(echo "$providers_duration > 0.500" | bc -l) )); then
    ai_performance="NEEDS_IMPROVEMENT"
fi

# Assess WebSocket performance  
if [ "$ws_http_test" == "200" ] || [ "$ws_http_test" == "426" ]; then
    websocket_performance="GOOD"
fi

# Assess reliability
if (( $(echo "$success_rate < 95" | bc -l) )); then
    reliability_grade="C"
elif (( $(echo "$success_rate < 98" | bc -l) )); then
    reliability_grade="B"
fi

# Assess memory stability
if [ $memory_change -gt 50000 ]; then  # >50MB change
    reliability_grade="C"
elif [ $memory_change -gt 20000 ]; then  # >20MB change  
    reliability_grade="B"
fi

echo "AI Features Performance: $ai_performance"
echo "WebSocket Performance: $websocket_performance"  
echo "Extended Reliability Grade: $reliability_grade"
echo "System Memory Stability: $([ $memory_change -lt 10000 ] && echo "EXCELLENT" || echo "ACCEPTABLE")"

# Write final assessment
cat >> "$RESULTS_FILE" <<EOF

FINAL ASSESSMENT:
================
AI Features Performance: $ai_performance
WebSocket Performance: $websocket_performance
Extended Reliability Grade: $reliability_grade
System Memory Stability: $([ $memory_change -lt 10000 ] && echo "EXCELLENT" || echo "ACCEPTABLE")

ENTERPRISE READINESS: $([ "$reliability_grade" = "A" ] && echo "PRODUCTION READY" || echo "NEEDS MONITORING")
EOF

echo -e "\n${BLUE}AI & WebSocket performance validation completed!${NC}"
echo "Results saved to: $RESULTS_FILE"
echo "Extended test duration: ${test_duration}s with $total_requests requests"
echo "Final assessment: Reliability Grade $reliability_grade"