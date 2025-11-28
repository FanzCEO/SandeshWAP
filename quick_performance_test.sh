#!/bin/bash

# Quick Performance Validation (10-minute comprehensive test)
# Enterprise-Grade Production Readiness Testing

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://localhost:5000"
RESULTS_FILE="quick_perf_results_$(date +%Y%m%d_%H%M%S).json"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  QUICK PERFORMANCE VALIDATION        ${NC}"
echo -e "${BLUE}======================================${NC}"

# Initialize results
cat > "$RESULTS_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "tests": {}
}
EOF

# Function to test endpoint with detailed timing
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local name="$4"
    
    echo -e "${YELLOW}Testing: $name${NC}"
    
    local times=()
    for i in {1..10}; do
        if [ "$method" == "GET" ]; then
            time=$(curl -w "%{time_total}" -s -o /dev/null "$API_BASE$endpoint" 2>/dev/null)
        elif [ "$method" == "POST" ]; then
            time=$(curl -w "%{time_total}" -s -o /dev/null -X POST -H "Content-Type: application/json" -d "$data" "$API_BASE$endpoint" 2>/dev/null)
        fi
        times+=($time)
        echo -n "."
    done
    echo
    
    # Calculate statistics
    local sum=0
    local min=${times[0]}
    local max=${times[0]}
    
    for time in "${times[@]}"; do
        sum=$(echo "$sum + $time" | bc -l)
        if (( $(echo "$time < $min" | bc -l) )); then
            min=$time
        fi
        if (( $(echo "$time > $max" | bc -l) )); then
            max=$time
        fi
    done
    
    local avg=$(echo "scale=3; $sum / 10" | bc -l)
    
    echo "  Avg: ${avg}s, Min: ${min}s, Max: ${max}s"
    
    # Update results
    jq ".tests[\"$name\"] = {\"avg\": $avg, \"min\": $min, \"max\": $max, \"method\": \"$method\", \"endpoint\": \"$endpoint\"}" "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
}

echo -e "${GREEN}=== BASIC ENDPOINT PERFORMANCE ===${NC}"
test_endpoint "GET" "/api" "" "health_check"
test_endpoint "GET" "/api/project" "" "project_info"
test_endpoint "GET" "/api/files" "" "file_listing"

echo -e "\n${GREEN}=== FILE OPERATIONS PERFORMANCE ===${NC}"
test_endpoint "POST" "/api/file/create" '{"path":"perf_test.txt","content":"test"}' "file_create"
test_endpoint "GET" "/api/file?path=perf_test.txt" "" "file_read"
test_endpoint "POST" "/api/file" '{"path":"perf_test.txt","content":"updated"}' "file_update"

echo -e "\n${GREEN}=== CONCURRENT LOAD TEST ===${NC}"
echo "Testing 20 concurrent requests to /api..."
start_time=$(date +%s.%N)

for i in {1..20}; do
    curl -s -o /dev/null "$API_BASE/api" &
done
wait

end_time=$(date +%s.%N)
duration=$(echo "$end_time - $start_time" | bc -l)
echo "20 concurrent requests completed in: ${duration}s"

jq ".tests.concurrent_load = {\"requests\": 20, \"duration\": $duration, \"rps\": $(echo "scale=2; 20 / $duration" | bc -l)}" "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"

echo -e "\n${GREEN}=== MEMORY USAGE TEST ===${NC}"
initial_memory=$(ps -o rss -p $(pgrep -f "server/index.ts") | tail -n +2 | awk '{sum+=$1} END {print sum}')
echo "Initial memory usage: ${initial_memory} KB"

# Generate load for 30 seconds
echo "Generating load for 30 seconds..."
for i in {1..30}; do
    curl -s -o /dev/null "$API_BASE/api" &
    curl -s -o /dev/null "$API_BASE/api/project" &
    sleep 1
done
wait

final_memory=$(ps -o rss -p $(pgrep -f "server/index.ts") | tail -n +2 | awk '{sum+=$1} END {print sum}')
memory_change=$((final_memory - initial_memory))
echo "Final memory usage: ${final_memory} KB"
echo "Memory change: ${memory_change} KB"

jq ".tests.memory_usage = {\"initial\": $initial_memory, \"final\": $final_memory, \"change\": $memory_change}" "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"

echo -e "\n${GREEN}=== LARGE DATA TEST ===${NC}"
large_content=$(printf 'x%.0s' {1..10000})  # 10KB content
test_endpoint "POST" "/api/file/create" "{\"path\":\"large_test.txt\",\"content\":\"$large_content\"}" "large_file_create"
test_endpoint "GET" "/api/file?path=large_test.txt" "" "large_file_read"

echo -e "\n${GREEN}=== ERROR HANDLING TEST ===${NC}"
test_endpoint "GET" "/api/nonexistent" "" "error_404"
test_endpoint "GET" "/api/file?path=nonexistent.txt" "" "file_not_found"

# Cleanup
curl -s -X DELETE -H "Content-Type: application/json" -d '{"path":"perf_test.txt"}' "$API_BASE/api/file" >/dev/null 2>&1
curl -s -X DELETE -H "Content-Type: application/json" -d '{"path":"large_test.txt"}' "$API_BASE/api/file" >/dev/null 2>&1

echo -e "\n${BLUE}=== PERFORMANCE SUMMARY ===${NC}"
echo "Results saved to: $RESULTS_FILE"

# Calculate final assessment
health_check_avg=$(jq -r '.tests.health_check.avg' "$RESULTS_FILE")
file_ops_avg=$(jq -r '.tests.file_create.avg' "$RESULTS_FILE")
concurrent_rps=$(jq -r '.tests.concurrent_load.rps' "$RESULTS_FILE")
memory_stable=$([ "$memory_change" -lt 10000 ] && echo "true" || echo "false")

production_ready="true"
if (( $(echo "$health_check_avg > 0.050" | bc -l) )); then
    production_ready="false"
    echo -e "${RED}WARNING: Health check avg (${health_check_avg}s) > 50ms${NC}"
fi

if (( $(echo "$file_ops_avg > 0.200" | bc -l) )); then
    production_ready="false"
    echo -e "${RED}WARNING: File ops avg (${file_ops_avg}s) > 200ms${NC}"
fi

if [ "$memory_stable" = "false" ]; then
    echo -e "${YELLOW}WARNING: Memory usage increased by ${memory_change}KB${NC}"
fi

assessment="{
  \"production_ready\": $production_ready,
  \"health_check_performance\": \"$([ $(echo "$health_check_avg < 0.050" | bc -l) -eq 1 ] && echo "EXCELLENT" || echo "ACCEPTABLE")\",
  \"file_operations_performance\": \"$([ $(echo "$file_ops_avg < 0.100" | bc -l) -eq 1 ] && echo "EXCELLENT" || echo "ACCEPTABLE")\",
  \"concurrent_performance\": \"$([ $(echo "$concurrent_rps > 50" | bc -l) -eq 1 ] && echo "EXCELLENT" || echo "ACCEPTABLE")\",
  \"memory_stability\": \"$([ "$memory_stable" = "true" ] && echo "STABLE" || echo "MONITORING_REQUIRED")\",
  \"overall_grade\": \"$([ "$production_ready" = "true" ] && echo "A" || echo "B")\"
}"

jq ".assessment = $assessment" "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"

echo -e "\n${GREEN}PERFORMANCE VALIDATION COMPLETE${NC}"
echo "Overall Grade: $(jq -r '.assessment.overall_grade' "$RESULTS_FILE")"
echo "Production Ready: $(jq -r '.assessment.production_ready' "$RESULTS_FILE")"
echo

cat "$RESULTS_FILE" | jq '.'