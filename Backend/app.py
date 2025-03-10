from flask import Flask, request, jsonify
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS

def ensure_valid_url(endpoint):
    if not endpoint.startswith("http://") and not endpoint.startswith("https://"):
        endpoint = "https://" + endpoint
    return endpoint

@app.route('/scan', methods=['POST'])
def scan_api():
    data = request.get_json()

    if not data or 'endpoint' not in data:
        return jsonify({"error": "Endpoint is required"}), 400

    api_endpoint = ensure_valid_url(data['endpoint'])
    vulnerabilities = []

    try:
        # Test 1: Authentication Testing
        auth_response = requests.get(api_endpoint, timeout=5)
        if auth_response.status_code == 200 and "Authorization" not in auth_response.request.headers:
            vulnerabilities.append({
                "type": "Authentication",
                "severity": "High",
                "description": "Missing token validation",
                "location": "Request Headers (Authorization missing)"
            })

        # Test 2: Authorization Testing
        authz_response = requests.get(api_endpoint, headers={"Authorization": "Bearer invalid-token"}, timeout=5)
        if authz_response.status_code == 200:
            vulnerabilities.append({
                "type": "Authorization",
                "severity": "High",
                "description": "Unauthorized access allowed",
                "location": "Request Headers (Invalid token accepted)"
            })

        # Test 3: Input Validation Testing (SQL Injection)
        injection_payload = "' OR 1=1 --"
        injection_url = f"{api_endpoint}?input={injection_payload}"
        injection_response = requests.get(injection_url, timeout=5)
        
        if "error" not in injection_response.text.lower():
            vulnerabilities.append({
                "type": "Input Validation",
                "severity": "Critical",
                "description": "SQL Injection vulnerability detected",
                "location": f"Query Parameter: input={injection_payload}"
            })

        # Test 4: Sensitive Data Exposure
        sensitive_keywords = ["email", "phone", "password"]
        exposed_fields = [word for word in sensitive_keywords if word in auth_response.text.lower()]

        if exposed_fields:
            vulnerabilities.append({
                "type": "Sensitive Data Exposure",
                "severity": "Medium",
                "description": "API leaks Personally Identifiable Information (PII)",
                "location": f"Response Body (Contains: {', '.join(exposed_fields)})"
            })

        # Test 5: Insecure HTTP Methods
        insecure_methods = ["PUT", "DELETE"]
        for method in insecure_methods:
            try:
                insecure_response = requests.request(method, api_endpoint, timeout=5)
                if insecure_response.status_code == 200:
                    vulnerabilities.append({
                        "type": "Insecure HTTP Methods",
                        "severity": "High",
                        "description": f"{method} method is enabled",
                        "location": f"Allowed Method: {method}"
                    })
            except requests.exceptions.RequestException:
                pass  # Ignore errors for methods that might not be supported

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

    # Generate Detailed Report
    report = {
        "vulnerabilities": vulnerabilities,
        "summary": {
            "total_vulnerabilities": len(vulnerabilities),
            "high_severity": len([v for v in vulnerabilities if v["severity"] == "High"]),
            "medium_severity": len([v for v in vulnerabilities if v["severity"] == "Medium"]),
            "critical_severity": len([v for v in vulnerabilities if v["severity"] == "Critical"])
        }
    }

    return jsonify(report)

if __name__ == '__main__':
    app.run(debug=True)
