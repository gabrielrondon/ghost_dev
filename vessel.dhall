let upstream = https://github.com/dfinity/vessel-package-set/releases/download/mo-0.9.8/package-set.dhall sha256:5c1d7f68d5fe4ce9ff0ce0c83c0b71b4c99b8d0b99ad1a71bf3f4d52daa4a8e1

let Package = { name : Text, version : Text, repo : Text, dependencies : List Text }

let additions = [
  { name = "noir-prover"
  , repo = "https://github.com/noir-lang/noir-motoko"
  , version = "v0.1.0"
  , dependencies = [] : List Text
  },
  { name = "noir-verifier"
  , repo = "https://github.com/noir-lang/noir-motoko"
  , version = "v0.1.0"
  , dependencies = [] : List Text
  }
] : List Package

in  upstream # additions 