const { generatePdfBuffer } = await import("./backend/services/agent/utils/pdfGen.js");

const md = `# Quantum Computing — A Comprehensive Report

## Executive Summary
Quantum computing leverages “superposition” and “entanglement” to solve problems
classical machines can’t — with speedups up to 100× in specific workloads.

### Key Concepts
- Qubits → fundamental units of quantum information
- Superposition & entanglement ✓
- Error correction (logical vs. physical qubits)

1. Shor's algorithm
2. Grover's search
3. Variational quantum eigensolvers

> "The future is quantum" — anonymous physicist

| Feature | Classical | Quantum |
| --- | --- | --- |
| Unit | Bit | Qubit |
| Speed | Linear | Exponential (some tasks) |

\`\`\`
import qiskit
qc = QuantumCircuit(2)
\`\`\`

Regular paragraph with an emoji 🚀 and math symbols: α ≈ 3.14, x ≤ 10, π ≥ 3.

## Conclusion
Quantum computing will transform cryptography and materials science.
`;

try {
  const { buffer, pageCount } = await generatePdfBuffer(md);
  const fs = await import("node:fs");
  fs.writeFileSync("test-output.pdf", buffer);
  console.log("SUCCESS - pages:", pageCount, "bytes:", buffer.length);
} catch (err) {
  console.log("FAILED:", err.message);
}
