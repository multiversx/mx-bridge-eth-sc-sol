import os
import json

# Directory containing the JSON files
directory = './abi/contracts/'

# Iterate through each file in the directory
for dirname in os.listdir(directory):
    print(f"Processing {dirname}")
    for filename in os.listdir(directory + dirname):
      if filename.endswith('.json') and not filename.endswith('abi.json'):
          # Construct the full file path
          file_path = os.path.join(directory + dirname, filename)

          # Open and read the JSON file
          with open(file_path, 'r') as json_file:
              data = json.load(json_file)
              # Extract the bytecode
              bytecode = data.get('bytecode')
              abi = ''.join([str(item) for item in data.get('abi')])

              if bytecode:
                  # Create a new .hex file name
                  hex_filename = os.path.splitext(filename)[0] + '.hex'
                  hex_file_path = os.path.join(directory + dirname, hex_filename)

                  # Write the bytecode to the .hex file
                  with open(hex_file_path, 'w') as hex_file:
                      hex_file.write(bytecode)

              if abi:
                  # Create a new .hex file name
                  abi_filename = os.path.splitext(filename)[0] + '.abi.json'
                  abi_file_path = os.path.join(directory + dirname, abi_filename)

                  # Write the bytecode to the .hex file
                  with open(hex_file_path, 'w') as hex_file:
                      hex_file.write(abi)

          print(f"Processed {filename}")

print("All files processed.")
