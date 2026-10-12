cd dist
ossutil rm oss://fehelper-i9527-xin/index.html
ossutil rm oss://fehelper-i9527-xin/robots.txt
ossutil rm oss://fehelper-i9527-xin/sitemap.xml
ossutil rm oss://fehelper-i9527-xin/assets -rf
ossutil cp assets oss://fehelper-i9527-xin/assets -r
ossutil cp index.html oss://fehelper-i9527-xin
ossutil cp robots.txt oss://fehelper-i9527-xin
ossutil cp sitemap.xml oss://fehelper-i9527-xin
cd ..
