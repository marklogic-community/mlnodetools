# Loading content

This file describes the load metadata format used in the ./data/.initial.json and .load.json metadata files.

These files are not loaded in to the database, but rather instruct mljsadmin as to each folder or file's settings.

These settings include URI prefix, collection(s), permissions, and much more.

The files are both JSON files.

## Initial .initial.json load file

This file specifies the default folder and settings to use for an initial load. This is used by the plain mljsadmin load
command.

This file typically uses a folder parameter to specify which folder (relative path) to process.

NOTE: when using the .initial.json file, any .load.json file in the specified folder's root is ignored. This is by
design. All subfolders have their .load.json files processed as normal.

## Folder .load.json files

These can contain anything the initial file can contain. They are typically used for specifying collections and permissions
of files in particular folders.

## Loading modules vs. loading content

The same initial and load JSON files are used within the ./modules folder in order to specify custom permissions on
library files. The options and processing are identical as for content folders. The only difference being the content
is loaded in to the modules database, not the content database.

## File format explanation

Below is a typical .load.json file:-

```json
{
  "prefix": "/originals",
  "collections": ["/content/originals","demo-content"],
  "security": {
    "somefile.json": [
      {"role": "senior-staff", "permissions": ["read","modify"]},
      {"role": "junior-staffr", "permissions": ["read"]}
    ]
  }
}
```

Note that "execute" is also a valid permission option. (applicable to Module files).

Below is a typical .initial.json file:-

```json
{
  "folder": "./initial", "prefix": "/docs/initial", "collections": ["initial"]
}
```

Note: A good trick to ensure no content is loaded initially is to set "folder" to a folder that does not exist. E.g. "folder": "blank"

WARNING: Without a ./data/.initial.json file, mljsadmin will load absolutely everything within the ./data/ folder. This is
to mirror Roxy's loader's default behaviour. I personally recommend always using sub folders. This enables you to be
flexible and to load content as needed for demo or testing purposes, by specifying mljsadmin --load=folder -f=./data/subfolder

Below are default settings that exist unless explicitly overridden:-

```json
{
  "recursive": true,
  "stripBaseFolder": true,
  "folder": "./data",
  "ignore": [".load.json", ".initial.json", ".DS_Store"],
  "prefix": "/",
  "collections": [],
  "security": {}
}
```

Note that the settings for ignore apply at all levels below the current level, whereas prefix applies to the current level only.
I.e. if you had a subfolder of "wibble", then the file prefixes would become "/docs/initial/wibble" in the initial example, above.

Security applies to files in the current folder only, whereas collections applies to this folder and all sub folders.

stripBaseFolder is enabled by default to prevent the annoying habit of some tools that prepend the entire absolute file name
to the URI of the document when loaded.
