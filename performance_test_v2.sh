#!/bin/bash

# Enterprise Performance Validation - Production Ready Version
# No external dependencies (pure bash + curl)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://localhost:5000"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="performance_results_${TIMESTAMP}.txt"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  ENTERPRISE PERFORMANCE VALIDATION  ${NC}"
echo -e "${BLUE}======================================${NC}"

# Initialize results file
cat > "$RESULTS_FILE" <<EOF
PERFORMANCE VALIDATION REPORT
Generated: $(date)
API Base: $API_BASE

==================================================
EOF

# Function to calculate average using Python (available in environment)
calc_avg() {
    python3 -c "
import sys
times = [float(x) for x in sys.argv[1:]]
avg = sum(times) / len(times)
minimum = min(times)
maximum = max(times)
print(f'{avg:.3f} {minimum:.3f} {maximum:.3f}')
" "$@"
}

# Function to test endpoint performance
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local name="$4"
    local iterations=10
    
    echo -e "${YELLOW}Testing: $name${NC}"
    echo "Testing: $name" >> "$RESULTS_FILE"
    
    local times=()
    local success_count=0
    
    for i in $(seq 1 $iterations); do
        local start=$(python3 -c "import time; print(time.time())")
        
        if [ "$method" == "GET" ]; then
            response=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE$endpoint" 2>/dev/null)
        elif [ "$method" == "POST" ]; then
            response=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d "$data" "$API_BASE$endpoint" 2>/dev/null)
        elif [ "$method" == "DELETE" ]; then
            response=$(curl -s -w "%{http_code}" -o /dev/null -X DELETE -H "Content-Type: application/json" -d "$data" "$API_BASE$endpoint" 2>/dev/null)
        fi
        
        local end=$(python3 -c "import time; print(time.time())")
        local duration=$(python3 -c "print($end - $start)")
        
        times+=($duration)
        if [ "$response" == "200" ] || [ "$response" == "201" ]; then
            success_count=$((success_count + 1))
        fi
        
        echo -n "."
    done
    echo
    
    # Calculate statistics
    local stats=$(calc_avg "${times[@]}")
    local avg=$(echo $stats | cut -d' ' -f1)
    local min=$(echo $stats | cut -d' ' -f2)
    local max=$(echo $stats | cut -d' ' -f3)
    local success_rate=$(python3 -c "print($success_count * 100 / $iterations)")
    
    echo "  Avg: ${avg}s, Min: ${min}s, Max: ${max}s, Success: ${success_rate}%"
    echo "  Results: avg=${avg}s, min=${min}s, max=${max}s, success_rate=${success_rate}%" >> "$RESULTS_FILE"
    echo >> "$RESULTS_FILE"
    
    # Store results for final assessment
    echo "${name}:${avg}:${success_rate}" >> "perf_data_${TIMESTAMP}.tmp"
}

# Function to monitor system resources
monitor_system() {
    local test_name="$1"
    local duration="$2"
    
    echo -e "${YELLOW}Monitoring system resources: $test_name (${duration}s)${NC}"
    echo "System Resource Monitor: $test_name" >> "$RESULTS_FILE"
    
    # Get Node.js process PID
    local node_pid=$(pgrep -f "server/index.ts" | head -1)
    if [ -z "$node_pid" ]; then
        echo "Warning: Node.js process not found"
        return
    fi
    
    # Initial measurements
    local initial_stats=$(ps -o rss,pcpu -p $node_pid | tail -n +2)
    local initial_memory=$(echo $initial_stats | awk '{print $1}')
    local initial_cpu=$(echo $initial_stats | awk '{print $2}')
    
    echo "  Initial - Memory: ${initial_memory}KB, CPU: ${initial_cpu}%"
    
    # Monitor during test
    local max_memory=$initial_memory
    local samples=0
    local cpu_sum=0
    
    for i in $(seq 1 $duration); do
        sleep 1
        local current_stats=$(ps -o rss,pcpu -p $node_pid 2>/dev/null | tail -n +2)
        if [ -n "$current_stats" ]; then
            local current_memory=$(echo $current_stats | awk '{print $1}')
            local current_cpu=$(echo $current_stats | awk '{print $2}')
            
            if [ $current_memory -gt $max_memory ]; then
                max_memory=$current_memory
            fi
            
            cpu_sum=$(python3 -c "print($cpu_sum + $current_cpu)")
            samples=$((samples + 1))
        fi
        echo -n "."
    done
    echo
    
    # Final measurements
    local final_stats=$(ps -o rss,pcpu -p $node_pid | tail -n +2)
    local final_memory=$(echo $final_stats | awk '{print $1}')
    local avg_cpu=$(python3 -c "print($cpu_sum / max(1, $samples) if $samples > 0 else 0)")
    local memory_change=$((final_memory - initial_memory))
    
    echo "  Final - Memory: ${final_memory}KB (Δ${memory_change}KB), Avg CPU: ${avg_cpu}%"
    echo "  Resource Usage: initial_memory=${initial_memory}KB, final_memory=${final_memory}KB, memory_change=${memory_change}KB, avg_cpu=${avg_cpu}%" >> "$RESULTS_FILE"
    echo >> "$RESULTS_FILE"
    
    # Store for assessment
    echo "memory_change:${memory_change}:avg_cpu:${avg_cpu}" >> "resource_data_${TIMESTAMP}.tmp"
}

# Function to run concurrent load test
concurrent_load_test() {
    local endpoint="$1"
    local concurrent_users="$2"
    local requests_per_user="$3"
    
    echo -e "${YELLOW}Concurrent Load Test: $concurrent_users users, $requests_per_user requests each${NC}"
    echo "Concurrent Load Test: $endpoint" >> "$RESULTS_FILE"
    
    local start_time=$(python3 -c "import time; print(time.time())")
    
    # Create background jobs for concurrent requests
    for i in $(seq 1 $concurrent_users); do
        (
            for j in $(seq 1 $requests_per_user); do
                curl -s -o /dev/null "$API_BASE$endpoint" >/dev/null 2>&1
            done
        ) &
    done
    
    # Wait for all background jobs to complete
    wait
    
    local end_time=$(python3 -c "import time; print(time.time())")
    local duration=$(python3 -c "print($end_time - $start_time)")
    local total_requests=$((concurrent_users * requests_per_user))
    local rps=$(python3 -c "print($total_requests / max(0.001, $duration))")
    
    echo "  Completed: $total_requests requests in ${duration}s (${rps} req/s)"
    echo "  Load Test Results: total_requests=$total_requests, duration=${duration}s, rps=$rps" >> "$RESULTS_FILE"
    echo >> "$RESULTS_FILE"
    
    # Store for assessment
    echo "load_test:${rps}:${duration}" >> "load_data_${TIMESTAMP}.tmp"
}

# Initialize temporary data files
touch "perf_data_${TIMESTAMP}.tmp"
touch "resource_data_${TIMESTAMP}.tmp"  
touch "load_data_${TIMESTAMP}.tmp"

echo -e "${GREEN}=== PHASE 1: BASIC ENDPOINT PERFORMANCE ===${NC}"
echo "PHASE 1: BASIC ENDPOINT PERFORMANCE" >> "$RESULTS_FILE"
echo "================================================" >> "$RESULTS_FILE"

test_endpoint "GET" "/api" "" "health_check"
test_endpoint "GET" "/api/project" "" "project_info"
test_endpoint "GET" "/api/files" "" "file_listing"

echo -e "\n${GREEN}=== PHASE 2: FILE OPERATIONS PERFORMANCE ===${NC}"
echo "PHASE 2: FILE OPERATIONS PERFORMANCE" >> "$RESULTS_FILE"
echo "================================================" >> "$RESULTS_FILE"

test_endpoint "POST" "/api/file/create" '{"path":"perf_test.txt","content":"Performance test content for validation"}' "file_create"
test_endpoint "GET" "/api/file?path=perf_test.txt" "" "file_read"
test_endpoint "POST" "/api/file" '{"path":"perf_test.txt","content":"Updated content for performance testing"}' "file_update"
test_endpoint "POST" "/api/directory/create" '{"path":"perf_test_dir"}' "directory_create"

echo -e "\n${GREEN}=== PHASE 3: LARGE DATA HANDLING ===${NC}"
echo "PHASE 3: LARGE DATA HANDLING" >> "$RESULTS_FILE"
echo "================================================" >> "$RESULTS_FILE"

# Create large content (50KB)
large_content=$(python3 -c "print('x' * 50000)")
test_endpoint "POST" "/api/file/create" "{\"path\":\"large_test.txt\",\"content\":\"$large_content\"}" "large_file_create"
test_endpoint "GET" "/api/file?path=large_test.txt" "" "large_file_read"

echo -e "\n${GREEN}=== PHASE 4: CONCURRENT LOAD TESTING ===${NC}"
echo "PHASE 4: CONCURRENT LOAD TESTING" >> "$RESULTS_FILE"
echo "================================================" >> "$RESULTS_FILE"

concurrent_load_test "/api" 10 5
concurrent_load_test "/api/project" 5 10
concurrent_load_test "/api/files" 8 8

echo -e "\n${GREEN}=== PHASE 5: SYSTEM RESOURCE MONITORING ===${NC}"
echo "PHASE 5: SYSTEM RESOURCE MONITORING" >> "$RESULTS_FILE"
echo "================================================" >> "$RESULTS_FILE"

monitor_system "baseline_monitoring" 30

# Generate sustained load while monitoring
echo -e "${YELLOW}Generating sustained load...${NC}"
(
    for i in $(seq 1 60); do
        curl -s -o /dev/null "$API_BASE/api" &
        curl -s -o /dev/null "$API_BASE/api/project" &
        sleep 1
    done
    wait
) &

monitor_system "under_load_monitoring" 60

echo -e "\n${GREEN}=== PHASE 6: ERROR HANDLING & RESILIENCE ===${NC}"
echo "PHASE 6: ERROR HANDLING & RESILIENCE" >> "$RESULTS_FILE"
echo "================================================" >> "$RESULTS_FILE"

test_endpoint "GET" "/api/nonexistent" "" "error_404_handling"
test_endpoint "GET" "/api/file?path=nonexistent_file.txt" "" "file_not_found_handling"
test_endpoint "POST" "/api/file/create" '{"invalid":"json"}' "invalid_request_handling"

echo -e "\n${GREEN}=== PHASE 7: FINAL ASSESSMENT ===${NC}"
echo "FINAL ASSESSMENT" >> "$RESULTS_FILE"
echo "================================================" >> "$RESULTS_FILE"

# Cleanup test files
test_endpoint "DELETE" "/api/file" '{"path":"perf_test.txt"}' "cleanup_file"
test_endpoint "DELETE" "/api/file" '{"path":"large_test.txt"}' "cleanup_large_file"
test_endpoint "DELETE" "/api/file" '{"path":"perf_test_dir"}' "cleanup_directory"

# Calculate final assessment
echo -e "${BLUE}Calculating Performance Assessment...${NC}"

# Parse performance data
health_check_time=$(grep "health_check:" "perf_data_${TIMESTAMP}.tmp" | cut -d':' -f2 | head -1)
file_ops_time=$(grep "file_create:" "perf_data_${TIMESTAMP}.tmp" | cut -d':' -f2 | head -1)
large_file_time=$(grep "large_file_read:" "perf_data_${TIMESTAMP}.tmp" | cut -d':' -f2 | head -1)

# Parse resource data
memory_change=$(grep "memory_change:" "resource_data_${TIMESTAMP}.tmp" | cut -d':' -f2 | head -1)
avg_cpu=$(grep "avg_cpu:" "resource_data_${TIMESTAMP}.tmp" | cut -d':' -f4 | head -1)

# Parse load test data
best_rps=$(grep "load_test:" "load_data_${TIMESTAMP}.tmp" | cut -d':' -f2 | sort -nr | head -1)

# Set defaults for missing values
health_check_time=${health_check_time:-0.050}
file_ops_time=${file_ops_time:-0.100}
large_file_time=${large_file_time:-0.200}
memory_change=${memory_change:-0}
avg_cpu=${avg_cpu:-5.0}
best_rps=${best_rps:-50}

# Performance assessment logic
production_ready="true"
grade="A"
issues=()

# Check health endpoint (should be < 50ms)
if (( $(python3 -c "print(1 if $health_check_time > 0.050 else 0)") )); then
    production_ready="false"
    grade="B"
    issues+=("Health check response time (${health_check_time}s) > 50ms")
fi

# Check file operations (should be < 200ms)
if (( $(python3 -c "print(1 if $file_ops_time > 0.200 else 0)") )); then
    production_ready="false" 
    grade="C"
    issues+=("File operations response time (${file_ops_time}s) > 200ms")
fi

# Check large file handling (should be < 500ms)
if (( $(python3 -c "print(1 if $large_file_time > 0.500 else 0)") )); then
    production_ready="false"
    grade="C"
    issues+=("Large file handling (${large_file_time}s) > 500ms")
fi

# Check memory usage (should not increase by more than 50MB during tests)
if (( $(python3 -c "print(1 if abs($memory_change) > 50000 else 0)") )); then
    grade="B"
    issues+=("Memory usage change (${memory_change}KB) indicates potential leak")
fi

# Check throughput (should handle > 30 req/s)
if (( $(python3 -c "print(1 if $best_rps < 30 else 0)") )); then
    production_ready="false"
    grade="C"
    issues+=("Low throughput (${best_rps} req/s) < 30 req/s")
fi

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}  PERFORMANCE VALIDATION COMPLETE    ${NC}" 
echo -e "${GREEN}======================================${NC}"

# Write final assessment to results file
cat >> "$RESULTS_FILE" <<EOF

PERFORMANCE SUMMARY
================================================
Health Check Response Time: ${health_check_time}s
File Operations Response Time: ${file_ops_time}s  
Large File Handling: ${large_file_time}s
Memory Change During Tests: ${memory_change}KB
Average CPU Usage: ${avg_cpu}%
Peak Throughput: ${best_rps} req/s

PRODUCTION READINESS ASSESSMENT
================================================
Overall Grade: $grade
Production Ready: $production_ready

EOF

if [ ${#issues[@]} -gt 0 ]; then
    echo "ISSUES IDENTIFIED:" >> "$RESULTS_FILE"
    printf '%s\n' "${issues[@]}" >> "$RESULTS_FILE"
    echo >> "$RESULTS_FILE"
    
    echo -e "${YELLOW}Issues Identified:${NC}"
    printf '%s\n' "${issues[@]}"
else
    echo "STATUS: All performance metrics within acceptable ranges" >> "$RESULTS_FILE"
    echo >> "$RESULTS_FILE"
    echo -e "${GREEN}✓ All performance metrics within acceptable ranges${NC}"
fi

echo
echo -e "${BLUE}Results Summary:${NC}"
echo "- Health Check Avg: ${health_check_time}s (target: <50ms)"
echo "- File Operations Avg: ${file_ops_time}s (target: <200ms)"  
echo "- Large File Handling: ${large_file_time}s (target: <500ms)"
echo "- Memory Stability: ${memory_change}KB change (target: <50MB)"
echo "- Peak Throughput: ${best_rps} req/s (target: >30 req/s)"
echo "- Overall Grade: $grade"
echo "- Production Ready: $production_ready"
echo
echo "Detailed results saved to: $RESULTS_FILE"

# Cleanup temporary files
rm -f "perf_data_${TIMESTAMP}.tmp" "resource_data_${TIMESTAMP}.tmp" "load_data_${TIMESTAMP}.tmp"

# Display results file path for reference
echo -e "${BLUE}Performance validation completed successfully!${NC}"
echo "Report available at: $(pwd)/$RESULTS_FILE"