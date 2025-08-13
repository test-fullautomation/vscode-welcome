#!/bin/bash

# Run vsce to package or publish the extension
echo "Checking if vsce is installed..."
command -v vsce || { echo "Error: vsce is not installed. Please install it first." >&2; exit 1; }
echo "Running vsce..."
vsce package --allow-missing-repository || { echo "Error: Failed to package the extension using vsce" >&2; exit 1; }