#!/bin/bash

# Define paths to the source and destination directories
SOURCE_DIR="./RobotFramework_AIO_website"
DEST_DIR="./vscode-welcome"

# Define URLs for the CSS files
FONT_AWESOME_URL="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css"
BOOTSTRAP_URL="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"
PRISM_URL="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css"

# Define output file names
FONT_AWESOME_FILE="all.min.css"
BOOTSTRAP_FILE="bootstrap.min.css"
PRISM_FILE="prism-tomorrow.min.css"

# Default files/patterns to exclude
EXCLUDE_FILES=("LICENSE" "download" "README.md" "contribution.html" "server.js")

# Parse command-line arguments for custom exclude list
while getopts "e:" opt; do
  case $opt in
    e)
      # Split comma-separated exclude patterns into array
      IFS=',' read -r -a EXCLUDE_FILES <<< "$OPTARG"
      ;;
    \?)
      echo "Usage: $0 [-e file1,file2,...]" >&2
      exit 1
      ;;
  esac
done

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory '$SOURCE_DIR' does not exist."
    exit 1
fi

# Check if destination directory exists
if [ ! -d "$DEST_DIR" ]; then
    echo "Error: Destination directory '$DEST_DIR' does not exist."
    exit 1
fi

# Copy files, excluding specified patterns
for file in "$SOURCE_DIR"/*; do
  skip_file=false
  for exclude in "${EXCLUDE_FILES[@]}"; do
    if [[ "$(basename "$file")" == $exclude ]]; then
      skip_file=true
      break
    fi
  done
  if [ "$skip_file" = false ]; then
    cp -rf --preserve "$file" "$DEST_DIR/"
  fi
done

# Check if the copy operation was successful
if [ $? -eq 0 ]; then
    echo "Successfully copied contents from '$SOURCE_DIR' to '$DEST_DIR'."
else
    echo "Error: Failed to copy contents from '$SOURCE_DIR' to '$DEST_DIR'."
    exit 1
fi

# Function to download a file with error handling
download_file() {
  local url=$1
  local output=$2
  proxy_args="--proxy-ntlm -x 127.0.0.1:3128"
  # Skip if URL is empty
  if [ -z "$url" ]; then
    echo "Skipping $output: No URL provided." >&2
    return
  fi

  # Check if file already exists
  if [ -f "$output" ]; then
    echo "File $output already exists. Skipping download."
    return
  fi

  echo "Downloading $output from $url..."
  if curl $proxy_args --fail --silent --show-error --location "$url" -o "$output"; then
    echo "Successfully downloaded $output"
  else
    echo "Error: Failed to download $output" >&2
    exit 1
  fi
}

# Download all assets
download_file "$FONT_AWESOME_URL" "$DEST_DIR/css/$FONT_AWESOME_FILE" || download_failed=true
download_file "$BOOTSTRAP_URL" "$DEST_DIR/css/$BOOTSTRAP_FILE" || download_failed=true
download_file "$PRISM_URL" "$DEST_DIR/css/$PRISM_FILE" || download_failed=true

echo "All files downloaded successfully!"