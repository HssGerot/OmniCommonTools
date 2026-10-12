cd dist
ossutil rm oss://fehelper-i9527-xin/index.html
ossutil rm oss://fehelper-i9527-xin/assets -rf
ossutil cp assets oss://fehelper-i9527-xin/assets -r
ossutil cp index.html oss://fehelper-i9527-xin
cd ..
